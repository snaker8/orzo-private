const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(__dirname, 'users.json');

// Mock fixTextEncoding
const fixTextEncoding = (text) => {
    try {
        let decoded = text;
        const hasHighChars = /[^\u0000-\u00ff]/.test(text);
        if (!hasHighChars) {
            const repaired = Buffer.from(text, 'latin1').toString('utf8');
            decoded = repaired;
        }
        return decoded.replace(/__ORD__/g, '/').replace(/\\/g, '/');
    } catch (e) {
        return text;
    }
};

const parseFile = (filePath) => {
    try {
        const isCsv = filePath.toLowerCase().endsWith('.csv');
        let workbook;

        if (isCsv) {
            const fileBuffer = fs.readFileSync(filePath);
            let fileContent;
            try {
                const utfDecoder = new TextDecoder('utf-8', { fatal: true });
                fileContent = utfDecoder.decode(fileBuffer);
            } catch (e) {
                try {
                    const eucDecoder = new TextDecoder('euc-kr', { fatal: true });
                    fileContent = eucDecoder.decode(fileBuffer);
                } catch (e2) {
                    fileContent = fileBuffer.toString('latin1');
                }
            }
            workbook = xlsx.read(fileContent, { type: 'string' });
        } else {
            const fileBuffer = fs.readFileSync(filePath);
            workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
        if (!rawRows || rawRows.length === 0) {
            // Only log if it's NOT a lock file
            if (!path.basename(filePath).startsWith('~$')) {
                console.log(`[Debug] ${path.basename(filePath)}: Empty rawRows`);
            }
            return [];
        }

        const keywords = ['이름', 'Name', '학생', '성명', '담당', '점수', 'Score', '과제', 'Title', '날짜'];
        let headerRowIndex = -1;

        for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
            const rowStr = JSON.stringify(rawRows[i]);
            const matchCount = keywords.filter(k => rowStr.includes(k)).length;
            if (matchCount >= 1) {
                headerRowIndex = i;
                break;
            }
        }

        // [FIX] Accept fallback if header not found but filename suggests it's valid?
        // Actually server.js requires headers to parse DATA.
        // But for SYNC (extracting names), server.js logic implies we iterate 'data' which is result of parseFile.
        // If parseFile returns [], then no sync happens.

        if (headerRowIndex === -1) {
            // Try to be lenient? No, if no header, we can't map columns.
            if (!path.basename(filePath).startsWith('~$')) {
                console.log(`[Debug] ${path.basename(filePath)}: No header found. Using index 0 as fallback for checking.`);
            }
            headerRowIndex = 0; // FALLBACK: Assume row 0 is header if we can't find keywords but file is valid?
        }

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
        if (!path.basename(filePath).startsWith('~$')) {
            console.error(`[Parse Error] ${path.basename(filePath)}:`, err.message);
        }
        return [];
    }
};

async function getFiles(dir) {
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

(async () => {
    console.log("=== Debugging Sync Logic ===");

    // 1. Check Users File
    let users = [];
    if (fs.existsSync(USERS_FILE)) {
        try {
            users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
            console.log(`[Users] Read ${users.length} users from users.json`);
        } catch (e) {
            console.error('[Users] Failed to parse users.json');
        }
    } else {
        console.error('[Users] users.json not found!');
    }

    const existingIds = new Set(users.map(u => u.id));

    // 2. Check Data Files
    if (!fs.existsSync(DATA_DIR)) {
        console.error('[Data] Data directory not found!');
        return;
    }

    const allFiles = await getFiles(DATA_DIR);
    console.log(`[Data] Found ${allFiles.length} files in data directory.`);

    let cachedData = [];
    let studentNames = new Set();

    for (const filePath of allFiles) {
        if (path.basename(filePath).startsWith('~$')) continue; // Skip lock files

        const lower = filePath.toLowerCase();
        if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
            const data = parseFile(filePath);
            if (data.length > 0) {
                const fileName = path.basename(filePath);
                data.forEach(item => {
                    // [UPDATED] Filename fallback logic
                    const nameFromFilename = fileName.split('_')[0];
                    const name = item.이름 || item.Name || item.학생 || item.성명 || item.name || nameFromFilename;

                    if (name && typeof name === 'string' && name.trim().length > 0) {
                        const normalized = name.trim();
                        studentNames.add(normalized);
                        cachedData.push(item);
                    }
                });
            }
        }
    }

    console.log(`[Data] Extracted ${studentNames.size} unique student names from ${cachedData.length} records.`);

    // 3. Compare
    const toAdd = [];
    studentNames.forEach(name => {
        if (!existingIds.has(name)) {
            toAdd.push(name);
        }
    });

    console.log(`[Sync] Potential New Users: ${toAdd.length}`);
    if (toAdd.length > 0) {
        console.log(`[Sync] Names to add: ${toAdd.join(', ')}`);
    } else {
        console.log('[Sync] No new users to add. (Sync logic would report 0 added)');
    }
})();
