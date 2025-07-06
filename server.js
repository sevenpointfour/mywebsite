const express = require('express');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3010;

// Middleware to parse JSON
app.use(express.json());

// Load required environment variables
if (!process.env.WEBSITE_ADMIN_TOKEN || !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    console.error("FATAL ERROR: Missing environment variables. Check your .env file.");
    process.exit(1);
}

const ADMIN_TOKEN = process.env.WEBSITE_ADMIN_TOKEN;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Serve static files from "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Admin verification middleware
const verifyAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (token === ADMIN_TOKEN) {
            return next();
        }
    }
    console.log(`SERVER: Admin verification failed for ${req.method} ${req.originalUrl}`);
    res.status(403).json({ error: 'Forbidden: Admin access required.' });
};

// interceptor for html files
app.use((req, res, next) => {
    const originalUrl = req.originalUrl;
    if (originalUrl.endsWith('.html')) {
        let name = path.basename(req.url);
        const contentDir = path.join(__dirname, 'content');
        const filePath = path.join(contentDir, name.replace('.html', '.json'));
        // if filePath exists on disk serve content.html
        fs.access(filePath)
            .then(() => {
                console.log('Serving content.html');
                res.sendFile(path.join(__dirname, 'public', 'content.html'));
            })
            .catch(() => {
                // If the file does not exist, continue to serve the original HTML file
                console.log('serving original html file');
                next();
            });
        return;
    } else {
        next();
    }
});



// GET page content
app.get('/api/page-content/:pageName', async (req, res) => {
    const { pageName } = req.params;
    const contentDir = path.join(__dirname, 'content');
    const filePath = path.join(contentDir, `${pageName}.json`);

    try {
        const data = await fs.readFile(filePath, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.json({ content: '' }); // No content yet
        } else {
            console.error(`Error reading content for ${pageName}:`, error);
            res.status(500).json({ error: 'Failed to load content.' });
        }
    }
});

// Save page content (admin only)
app.post('/api/page-content/:pageName', verifyAdmin, async (req, res) => {
    const { pageName } = req.params;
    const { content } = req.body;
    // ensure header contains admin token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.substring(7) !== ADMIN_TOKEN) {
        return res.status(403).json({ error: 'Forbidden: Invalid or missing admin token.' });
    }
    
    if (content === undefined) {
        return res.status(400).json({ error: 'Content is missing.' });
    }

    const contentDir = path.join(__dirname, 'content');
    const filePath = path.join(contentDir, `${pageName}.json`);

    try {
        await fs.mkdir(contentDir, { recursive: true });
        await fs.writeFile(filePath, JSON.stringify({ content }, null, 2));
        res.json({ success: true, message: `Content for ${pageName} saved successfully.` });
    } catch (error) {
        console.error(`Error saving content for ${pageName}:`, error);
        res.status(500).json({ error: 'Failed to save content.' });
    }
});

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        console.log(`SERVER: Admin login successful`);
        res.json({ success: true, token: ADMIN_TOKEN });
    } else {
        console.log(`SERVER: Admin login failed`);
        res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }
});

// Verify admin token
app.get('/api/admin/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        if (token === ADMIN_TOKEN) {
            return res.json({ isAdmin: true });
        }
    }
    res.json({ isAdmin: false });
});

// Health check
app.get('/ping', (req, res) => {
    res.send('pong');
});

// Fallback for client-side routing
app.get('*', (req, res) => {
    if (path.extname(req.path).length > 0) {
        return res.status(404).send('Resource not found');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Serving static files from: ${path.join(__dirname, 'public')}`);
});
