const http = require('http');

const post = (path, body, headers = {}) => {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                ...headers
            }
        };
        const req = http.request(options, res => {
            let buffer = '';
            res.on('data', chunk => buffer += chunk);
            res.on('end', () => resolve(JSON.parse(buffer)));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
};

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
    console.log("1. Syncing Users...");
    try {
        const syncRes = await post('/api/users/sync', {}, { 'x-admin-password': 'orzoai' }); // Assuming default admin pw
        console.log("Sync Result:", syncRes);
    } catch (e) {
        console.error("Sync Failed:", e.message);
    }

    console.log("\n2. Attempting Login for '최시후' (choisihu1227@gmail.com)...");
    const userId = "최시후";
    const userPw = "1234";

    try {
        const loginRes = await post('/api/login', { id: userId, pw: userPw });
        console.log("Login Result:", loginRes);

        if (loginRes.success) {
            console.log("\n3. Fetching Data...");
            const data = await get('/api/data', {
                'x-user-id': encodeURIComponent(userId),
                'x-user-pw': encodeURIComponent(userPw)
            });
            console.log("Response Type:", typeof data);
            console.log("Response Data:", JSON.stringify(data, null, 2));
            console.log(`Data Count: ${data ? data.length : 'N/A'}`);
            if (data.length > 0) {
                console.log("First Record:", data[0]);
                console.log("SUCCESS: Data retrieved correctly.");
            } else {
                console.log("FAILURE: No data returned.");
            }
        } else {
            console.log("FAILURE: Login failed. User might not be synced or password wrong.");
        }
    } catch (e) {
        console.error("Error:", e);
    }
})();
