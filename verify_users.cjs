const http = require('http');

const get = (path, headers = {}) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'GET',
            headers: headers
        };
        const req = http.request(options, res => {
            let buffer = '';
            res.on('data', chunk => buffer += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(buffer));
                } catch (e) {
                    console.error("Failed to parse JSON:", buffer);
                    resolve([]);
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
};

(async () => {
    console.log("Checking /api/users endpoint...");
    try {
        const users = await get('/api/users', { 'x-admin-password': 'orzoai' });
        console.log(`Users Count: ${users.length}`);
        if (users.length > 0) {
            console.log("First User:", JSON.stringify(users[0]));
        } else {
            console.log("No users found");
        }
    } catch (e) {
        console.error("Users Fetch Error:", e);
    }
})();
