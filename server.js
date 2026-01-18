import express from 'express';
import cors from 'cors';
import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { read, utils } from 'xlsx';
import multer from 'multer'; // [NEW] File Upload Support

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'orzoai'; // [SEC] Server-side secret

// [HELPER] Smart Encoding Repair
const fixTextEncoding = (text) => {
    try {
        let decoded = text;
        // Check for Mojibake (If it looks like Latin1 but should be UTF-8)
        // If we only have chars <= 255, it might be a Korean string read as Latin1.
        // Real UTF-8 would have multi-byte chars (encoded as multiple Latin1 chars).
        const hasHighChars = /[^\u0000-\u00ff]/.test(text);

        if (!hasHighChars) {
            // Try repairing: Latin1 -> Buffer -> UTF-8
            const repaired = Buffer.from(text, 'latin1').toString('utf8');
            // Check if repair made sense (e.g. resulted in valid Hangul)
            // This is a heuristic. If the repaired string is radically different or contains common valid chars.
            // Simplified: Just use the repair.
            decoded = repaired;
            // console.log(`[Encoding] Repaired: ${text} => ${decoded}`);
        } else {
            // console.log(`[Encoding] Accessing raw: ${text}`);
        }

        // Always fix __ORD__ and backslashes
        return decoded.replace(/__ORD__/g, '/').replace(/\\/g, '/');
    } catch (e) {
        console.error('[Encoding Info]', e);
        return text;
    }
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        try {
            // [FIX] Use Shared Helper
            const decodedName = fixTextEncoding(file.originalname);

            // Extract directory
            let relativePath = '.';
            if (decodedName.includes('/')) {
                relativePath = path.posix.dirname(decodedName);
            }

            // [SEC] Path Traversal Protection
            // 1. Normalize path
            // 2. Remove any '..' components
            // 3. Ensure we don't go outside DATA_DIR
            const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');

            console.log(`[Dest] Target Path: ${safePath}`);

            const targetDir = path.join(DATA_DIR, safePath === '.' ? '' : safePath);

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            cb(null, targetDir);
        } catch (err) {
            console.error('[Dest Error]', err);
            cb(err);
        }
    },
    filename: (req, file, cb) => {
        // [FIX] Use Shared Helper (This was missing!)
        const decodedName = fixTextEncoding(file.originalname);
        const finalName = path.basename(decodedName);

        console.log(`[Save] Saving file as: ${finalName}`);
        cb(null, finalName);
    }
});
const upload = multer({ storage: storage });

// Middleware
app.use(cors());
app.use(express.json());

// [NEW] Upload Endpoint (Supports Multiple Files/Folders)
app.post('/api/upload', upload.array('files'), (req, res) => {
    try {
        // [SEC] Server-Side Authentication
        const clientPw = req.headers['x-admin-password'] || req.query.pw || req.body.pw;
        // [DEBUG] Log Auth details
        // console.log(`[Auth Check] Upload - IP: ${req.ip}, Received: '${clientPw}', Expected: '${ADMIN_PASSWORD}'`);

        if (!clientPw || clientPw !== ADMIN_PASSWORD) {
            console.warn(`[Auth Failed] Upload - IP: ${req.ip}. Received: '${clientPw}', Expected: '${ADMIN_PASSWORD}'`);
            return res.status(401).json({ success: false, message: 'Authentication failed. Invalid password.' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files uploaded' });
        }
        console.log(`[Upload] Successfully stored ${req.files.length} files.`);

        // Trigger generic reload
        triggerReload();

        res.json({ success: true, count: req.files.length });
    } catch (err) {
        console.error('[Upload Error]', err);
        res.status(500).json({ success: false, message: 'Upload failed: ' + err.message });
    }
});

// Request Logger
app.use((req, res, next) => {
    console.log(`[Request] ${req.method} ${req.url}`);
    next();
});

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
    console.log(`[Server] Created 'data' directory at ${DATA_DIR}`);
}

// In-memory data store
let cachedData = [];

// Helper: Parse File (Robust Encoding Handling)
const parseFile = (filePath) => {
    try {
        const isCsv = filePath.toLowerCase().endsWith('.csv');
        let workbook;

        if (isCsv) {
            const fileBuffer = fs.readFileSync(filePath);
            let fileContent;

            // [SMART ENCODING DETECTION v2.1]
            try {
                // 1. Try UTF-8 first (Strict)
                const utfDecoder = new TextDecoder('utf-8', { fatal: true });
                fileContent = utfDecoder.decode(fileBuffer);
            } catch (e) {
                // 2. Fallback to EUC-KR (Common for Korean Excel CSVs)
                try {
                    const eucDecoder = new TextDecoder('euc-kr', { fatal: true });
                    fileContent = eucDecoder.decode(fileBuffer);
                } catch (e2) {
                    // 3. Fallback to Latin-1
                    console.warn(`[Parser] Encoding detection failed for ${path.basename(filePath)}. Falling back to Latin1.`);
                    fileContent = fileBuffer.toString('latin1');
                }
            }

            workbook = read(fileContent, { type: 'string' });
        } else {
            // Binary read for Excel (xlsx, xls)
            const fileBuffer = fs.readFileSync(filePath);
            workbook = read(fileBuffer, { type: 'buffer' });
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // 1. Read as 2D Array first
        const rawRows = utils.sheet_to_json(worksheet, { header: 1 });
        if (!rawRows || rawRows.length === 0) return [];

        // 2. Find Header Row
        // [UPDATED] Added '성명' to keywords
        const keywords = ['이름', 'Name', '학생', '성명', '담당', '점수', 'Score', '과제', 'Title', '날짜'];
        let headerRowIndex = 0;

        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
            const rowStr = JSON.stringify(rawRows[i]);
            const matchCount = keywords.filter(k => rowStr.includes(k)).length;
            if (matchCount >= 1) {
                headerRowIndex = i;
                break;
            }
        }

        // 3. Convert to Object Array
        const headers = rawRows[headerRowIndex].map(h => String(h || '').trim());
        const dataRows = rawRows.slice(headerRowIndex + 1);

        const jsonData = dataRows.map(row => {
            let obj = {};
            headers.forEach((h, idx) => {
                if (h) obj[h] = row[idx];
            });
            return obj;
        });

        return jsonData;

    } catch (err) {
        console.error(`[Parse Error] Failed to parse ${path.basename(filePath)}:`, err.message);
        return [];
    }
};

// Helper: Recursive file search (Async)
async function getFiles(dir) {
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

// Helper: Async Reload to prevent blocking
let isReloading = false;
const loadDataAsync = async () => {
    if (isReloading) {
        console.log('[scan] Skip: Already reloading...');
        return;
    }
    isReloading = true;
    console.log('------------------------------------------------');
    console.log(`[scan] Scanning folder: ${DATA_DIR}`);

    try {
        if (!fs.existsSync(DATA_DIR)) {
            console.log('[scan] Error: Data directory missing!');
            isReloading = false;
            return;
        }

        const allFiles = await getFiles(DATA_DIR);
        console.log(`[scan] Found ${allFiles.length} items total.`);

        let newData = [];
        let count = 0;

        // Process in chunks to avoid blocking event loop
        for (const filePath of allFiles) {
            const lower = filePath.toLowerCase();
            if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
                const data = parseFile(filePath); // Still sync per file, but fast enough usually
                if (data.length > 0) {
                    const fileName = path.basename(filePath);
                    const relativePath = path.relative(DATA_DIR, filePath);
                    const folderPath = path.dirname(relativePath);

                    // Add metadata
                    const nameFromFilename = fileName.split('_')[0];
                    const tagged = data.map(row => ({
                        ...row,
                        sourceFile: fileName,
                        folderPath: folderPath,
                        // [FIX] Ensure name exists (from file content OR filename) and Normalize
                        name: (row.이름 || row.Name || row.학생 || row.성명 || row.name || nameFromFilename).trim().normalize('NFC')
                    }));

                    newData.push(...tagged);
                    count++;
                }
            }
            // Small yield every 10 files
            if (count % 10 === 0) await new Promise(resolve => setTimeout(resolve, 1));
        }

        cachedData = newData; // Atomic swap
        console.log(`[scan] DONE. Total records in memory: ${cachedData.length}`);
    } catch (err) {
        console.error('[scan error]', err);
    } finally {
        console.log('------------------------------------------------');
        isReloading = false;
    }
};

// Helper: Debounce wrapper
const debounce = (func, timeout = 1000) => {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
};

const triggerReload = debounce(() => {
    loadDataAsync();
}, 1000);

// Watcher
console.log(`[Server] Starting Watcher on: ${DATA_DIR}`);
const watcher = chokidar.watch(DATA_DIR, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: false, // Fire 'add' events on startup to trigger initial load
    awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
    }
});

watcher
    .on('add', path => {
        // console.log(`[Watcher] File detected: ${path}`);
        triggerReload();
    })
    .on('change', path => {
        console.log(`[Watcher] File changed: ${path}`);
        triggerReload();
    })
    .on('unlink', path => {
        console.log(`[Watcher] File removed: ${path}`);
        triggerReload();
    });

// [NEW] Load Users
const USERS_FILE = path.join(__dirname, 'users.json');
const getUsers = () => {
    try {
        if (!fs.existsSync(USERS_FILE)) return [];
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('[Auth] Failed to load users.json', e);
        return [];
    }
};

// [NEW] Login Endpoint
app.post('/api/login', (req, res) => {
    const { id, pw } = req.body;
    const users = getUsers();

    // 1. Check Admin (Legacy)
    if (id === 'admin' && pw === ADMIN_PASSWORD) {
        return res.json({ success: true, user: { id: 'admin', name: '관리자', role: 'admin' } });
    }

    // 2. Check Users (including Multi-Admins)
    const user = users.find(u => u.id === id && u.pw === pw);
    if (user) {
        // [CHECK] Teacher Approval
        if (user.role === 'teacher' && user.approved === false) {
            return res.status(401).json({ success: false, message: '관리자 승인 대기 중입니다. 승인 후 이용 가능합니다.' });
        }
        return res.json({ success: true, user: { id: user.id, name: user.name, role: user.role } });
    }

    return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
});

// [NEW] Register Endpoint (Teacher)
app.post('/api/register', (req, res) => {
    const { id, pw, name } = req.body;
    if (!id || !pw || !name) {
        return res.status(400).json({ success: false, message: '모든 필드를 입력해주세요.' });
    }

    const users = getUsers();
    if (users.some(u => u.id === id)) {
        return res.status(400).json({ success: false, message: '이미 존재하는 아이디입니다.' });
    }

    const newUser = {
        id,
        pw,
        name,
        role: 'teacher',
        approved: false // Default to false for teachers
    };

    users.push(newUser);

    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
        console.log(`[Auth] New teacher registered: ${name} (${id})`);
        res.json({ success: true, message: '가입 신청이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.' });
    } catch (e) {
        console.error('[Auth] Register failed', e);
        res.status(500).json({ success: false, message: '가입 처리 중 오류가 발생했습니다.' });
    }
});

// [NEW] Change Password Endpoint
app.post('/api/change-password', (req, res) => {
    const { id, oldPw, newPw } = req.body;
    if (!id || !oldPw || !newPw) {
        return res.status(400).json({ success: false, message: '잘못된 요청입니다.' });
    }

    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === id);

    if (userIndex === -1) {
        return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    if (users[userIndex].pw !== oldPw) {
        return res.status(401).json({ success: false, message: '현재 비밀번호가 일치하지 않습니다.' });
    }

    users[userIndex].pw = newPw;

    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
        console.log(`[Auth] Password changed for user: ${id}`);
        res.json({ success: true, message: '비밀번호가 변경되었습니다.' });
    } catch (e) {
        console.error('[Auth] Password change failed', e);
        res.status(500).json({ success: false, message: '비밀번호 변경 중 오류가 발생했습니다.' });
    }
});

// [NEW] Change ID Endpoint
app.post('/api/change-id', (req, res) => {
    const { currentId, newId, pw } = req.body;
    if (!currentId || !newId || !pw) {
        return res.status(400).json({ success: false, message: '잘못된 요청입니다.' });
    }

    if (currentId === newId) {
        return res.status(400).json({ success: false, message: '새 아이디가 현재 아이디와 같습니다.' });
    }

    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === currentId);

    if (userIndex === -1) {
        return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    if (users[userIndex].pw !== pw) {
        return res.status(401).json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
    }

    // Check collision
    if (users.some(u => u.id === newId)) {
        return res.status(400).json({ success: false, message: '이미 존재하는 아이디입니다.' });
    }

    // Update ID
    users[userIndex].id = newId;

    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
        console.log(`[Auth] ID changed: ${currentId} -> ${newId}`);
        res.json({ success: true, message: '아이디가 변경되었습니다. 다시 로그인해주세요.' });
    } catch (e) {
        console.error('[Auth] ID change failed', e);
        res.status(500).json({ success: false, message: '아이디 변경 중 오류가 발생했습니다.' });
    }
});

// API Endpoint
app.get('/api/data', (req, res) => {
    // Auth Headers
    const clientPw = req.headers['x-admin-password']; // Legacy/Admin
    const userId = req.headers['x-user-id'] ? decodeURIComponent(req.headers['x-user-id']) : null;
    const userPw = req.headers['x-user-pw'] ? decodeURIComponent(req.headers['x-user-pw']) : null;

    // 1. Global Admin Access (Legacy Password)
    if (clientPw && clientPw.trim().toLowerCase() === ADMIN_PASSWORD.trim().toLowerCase()) {
        return res.json(cachedData);
    }
    const fallbackPw = req.query.pw || req.body.pw;
    if (fallbackPw && fallbackPw.trim().toLowerCase() === ADMIN_PASSWORD.trim().toLowerCase()) {
        return res.json(cachedData);
    }

    // 2. User Access (Student OR Multi-Admin)
    if (userId && userPw) {
        const users = getUsers();
        const user = users.find(u => u.id === userId && u.pw === userPw);

        if (user) {
            // [NEW] Multi-Admin & Teacher Support: Any user with role 'admin' OR 'teacher' sees everything
            if (user.role === 'admin' || user.role === 'teacher') {
                return res.json(cachedData);
            }

            // Student Access: Filter Data
            const targetName = user.name.trim().normalize('NFC');
            console.log(`[Auth] Filtering for student: '${targetName}'`);

            const studentData = cachedData.filter(item => {
                if (!item.name) return false;
                const itemName = String(item.name).trim().normalize('NFC');
                return itemName === targetName;
            });
            return res.json(studentData);
        }
    }

    console.warn(`[Auth Failed] Data Access - IP: ${req.ip}`);
    return res.status(401).json({ success: false, message: 'Authentication failed.' });
});

// [NEW] User Management Endpoints
// Check Admin Auth Helper
const checkAdminAuth = (req) => {
    const clientPw = req.headers['x-admin-password'] || req.query.pw || req.body.pw;
    if (clientPw && clientPw === ADMIN_PASSWORD) return true;

    // Check User Headers
    const userId = req.headers['x-user-id'] ? decodeURIComponent(req.headers['x-user-id']) : null;
    const userPw = req.headers['x-user-pw'] ? decodeURIComponent(req.headers['x-user-pw']) : null;

    if (userId && userPw) {
        const users = getUsers();
        const user = users.find(u => u.id === userId && u.pw === userPw);
        if (user && user.role === 'admin') return true;
    }
    return false;
};

app.get('/api/users', (req, res) => {
    if (!checkAdminAuth(req)) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const users = getUsers();
    res.json(users);
});

app.post('/api/users', (req, res) => {
    if (!checkAdminAuth(req)) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        const newUsers = req.body;
        if (!Array.isArray(newUsers)) {
            return res.status(400).json({ success: false, message: 'Invalid data format' });
        }
        fs.writeFileSync(USERS_FILE, JSON.stringify(newUsers, null, 2), 'utf8');
        console.log(`[Users] Updated users.json. Total count: ${newUsers.length}`);
        res.json({ success: true, count: newUsers.length });
    } catch (e) {
        console.error('[Users] Update failed', e);
        res.status(500).json({ success: false, message: 'Failed to update users' });
    }
});

app.post('/api/users/sync', async (req, res) => {
    if (!checkAdminAuth(req)) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
        if (cachedData.length === 0) {
            console.log('[Users] Cache empty. Forcing scan before sync...');
            await loadDataAsync();
        }

        const currentUsers = getUsers();
        const existingIds = new Set(currentUsers.map(u => u.id));
        const addedUsers = [];
        const studentNames = new Set();
        cachedData.forEach(item => {
            const name = item.이름 || item.Name || item.학생 || item.성명 || item.name;
            if (name && typeof name === 'string' && name.trim().length > 0) {
                studentNames.add(name.trim());
            }
        });

        console.log(`[Users] Found ${studentNames.size} unique students in ${cachedData.length} records.`);

        studentNames.forEach(name => {
            if (!existingIds.has(name)) {
                const newUser = {
                    id: name,
                    pw: '1234',
                    name: name,
                    role: 'student'
                };
                currentUsers.push(newUser);
                addedUsers.push(newUser);
                existingIds.add(name);
            }
        });

        if (addedUsers.length > 0) {
            fs.writeFileSync(USERS_FILE, JSON.stringify(currentUsers, null, 2), 'utf8');
            console.log(`[Users] Synced. Added ${addedUsers.length} new users.`);
        }

        res.json({
            success: true,
            addedCount: addedUsers.length,
            totalCount: currentUsers.length,
            scannedRecords: cachedData.length,
            foundStudents: studentNames.size,
            message: `동기화 완료. ${cachedData.length}개 데이터에서 총 ${studentNames.size}명의 학생을 확인했습니다. (새로 추가된 사용자: ${addedUsers.length}명)\n이미 모든 사용자가 등록되어 있을 수 있습니다.`
        });
    } catch (e) {
        console.error('[Users] Sync failed', e);
        res.status(500).json({ success: false, message: 'Failed to sync users' });
    }
});

// [NEW] Serve Static Files (Production/Deployment)
const DIST_DIR = path.join(__dirname, 'dist');
if (fs.existsSync(DIST_DIR)) {
    console.log(`[Server] Serving static files from ${DIST_DIR}`);
    app.use(express.static(DIST_DIR));

    // SPA Catch-all -> index.html
    app.get('*', (req, res) => {
        res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
} else {
    // Fallback for Dev only
    app.get('/', (req, res) => {
        res.send("API Server Running. (Frontend build not found, please run 'npm run build')");
    });
}




app.listen(PORT, '0.0.0.0', () => { // [UPDATED] Listen on all interfaces
    console.log(`=========================================`);
    console.log(`   ORZO DATA SERVER Running on Port ${PORT}`);
    console.log(`=========================================`);
    // Initial load in case watcher is slow
    triggerReload();
});
