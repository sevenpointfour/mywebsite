const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3010;

function getUploadPath(req) {
    let uploadPath = 'public/photos/';
    if (req.body.folder) {
        // Basic sanitization to prevent directory traversal
        const folderName = path.basename(req.body.folder);
        uploadPath = path.join('public/photos/', folderName);
    }
    return uploadPath;
}
// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        let uploadPath = getUploadPath(req);
        try {
            await fs.mkdir(uploadPath, { recursive: true });
        } catch (error) {
            console.error('Error creating upload directory:', error);
            return cb(error);
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

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
                res.sendFile(path.join(__dirname, 'public', 'content.html'));
            })
            .catch(() => {
                // If the file does not exist, continue to serve the original HTML file
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
    const { content, items } = req.body;
    // ensure header contains admin token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.substring(7) !== ADMIN_TOKEN) {
        return res.status(403).json({ error: 'Forbidden: Invalid or missing admin token.' });
    }

    if (!pageName || pageName.trim() === '') {
        return res.status(400).json({ error: 'PageName is missing.' });
    }

    if (content === undefined && items === undefined) {
        return res.status(400).json({ error: 'Content is missing.' });
    }

    const contentDir = path.join(__dirname, 'content');
    const filePath = path.join(contentDir, `${pageName}.json`);

    try {
        await fs.mkdir(contentDir, { recursive: true });
        await fs.writeFile(filePath, JSON.stringify({ content, items }, null, 2));
        res.json({ success: true, message: `Content for ${pageName} saved successfully.` });
    } catch (error) {
        console.error(`Error saving content for ${pageName}:`, error);
        res.status(500).json({ error: 'Failed to save content.' });
    }
});

app.delete('/api/page-content/:pageName', verifyAdmin, async (req, res) => {
    const { pageName } = req.params;
    // ensure header contains admin token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.substring(7) !== ADMIN_TOKEN) {
        return res.status(403).json({ error: 'Forbidden: Invalid or missing admin token.' });
    }

    if (!pageName || pageName.trim() === '') {
        return res.status(400).json({ error: 'PageName is missing.' });
    }

    const contentDir = path.join(__dirname, 'content');
    const filePath = path.join(contentDir, `${pageName}.json`);

    try {
        await fs.unlink(filePath);
        res.json({ success: true, message: `Content for ${pageName} deleted successfully.` });
    } catch (error) {
        console.error(`Error deleting content for ${pageName}:`, error);
        res.status(500).json({ error: 'Failed to delete content.' });
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

// Image upload endpoint (admin only)
app.post('/api/admin/upload-image', verifyAdmin, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send({ error: 'No file uploaded.' });
    }
    const folder = req.body.folder && req.body.folder !== 'root' ? `${req.body.folder}/` : '';
    res.json({ location: `/photos/${folder}${req.file.filename}` });
});

// Recursive function to get all image files in a directory and its subdirectories, grouped by folder
async function walk(dir, baseDir) {
    let files = await fs.readdir(dir, { withFileTypes: true });
    let imagesByFolder = {};

    for (let file of files) {
        const fullPath = path.join(dir, file.name);
        const relativePath = path.relative(baseDir, fullPath);

        if (file.isDirectory()) {
            const subfolderImages = await walk(fullPath, baseDir);
            for (const folder in subfolderImages) {
                if (imagesByFolder[folder]) {
                    imagesByFolder[folder].push(...subfolderImages[folder]);
                } else {
                    imagesByFolder[folder] = subfolderImages[folder];
                }
            }
        } else if (file.isFile() && ['.jpg', '.jpeg', '.png', '.gif'].includes(path.extname(file.name).toLowerCase())) {
            const folderName = path.dirname(relativePath);
            const displayFolderName = folderName === '.' ? 'root' : folderName.split(path.sep)[0]; // Get top-level folder name or 'root'

            if (!imagesByFolder[displayFolderName]) {
                imagesByFolder[displayFolderName] = [];
            }
            imagesByFolder[displayFolderName].push(relativePath);
        }
    }
    return imagesByFolder;
}

// handler to get list of images in the public/photos folder, grouped by subfolder
app.get('/api/images', async (req, res) => {
    const photosDir = path.join(__dirname, 'public', 'photos');
    try {
        const imagesByFolder = await walk(photosDir, photosDir);
        // Sort images within each folder and sort folder names
        for (const folder in imagesByFolder) {
            imagesByFolder[folder].sort();
        }
        const sortedFolders = Object.keys(imagesByFolder).sort();
        const sortedImagesByFolder = {};
        sortedFolders.forEach(folder => {
            sortedImagesByFolder[folder] = imagesByFolder[folder];
        });

        res.json({ imagesByFolder: sortedImagesByFolder });
    } catch (error) {
        console.error('Error reading images directory:', error);
        res.status(500).json({ error: 'Failed to retrieve images.' });
    }
});

app.delete('/api/images/:imagePath(*)', verifyAdmin, async (req, res) => {
    const imagePath = req.params.imagePath;
    if (!imagePath) {
        return res.status(400).json({ error: 'Image path is required.' });
    }

    const fullImagePath = path.join(__dirname, 'public', 'photos', imagePath);

    try {
        await fs.unlink(fullImagePath);
        res.json({ success: true, message: `Image ${imagePath} deleted successfully.` });
    } catch (error) {
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Image not found.' });
        }
        console.error(`Error deleting image ${imagePath}:`, error);
        res.status(500).json({ error: 'Failed to delete image.' });
    }
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
