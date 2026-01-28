console.error('MINIMAL SERVER TEST: This is a test message to confirm the script is running.');
const http = require('http');
http.createServer((req, res) => { res.end('Test server is running.'); }).listen(process.env.PORT || 3010);
