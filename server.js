const express = require('express');
// Force server update
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
// const bcrypt = require('bcrypt'); // No longer needed for OTP login
const nodemailer = require('nodemailer');
const archiver = require('archiver');
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
if (
    !process.env.WEBSITE_ADMIN_TOKEN ||
    !process.env.ADMIN_USERNAME) {
    console.error("FATAL ERROR: Missing environment variables. Check your .env file.");
    process.exit(1);
}

const ADMIN_TOKEN = process.env.WEBSITE_ADMIN_TOKEN;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
// const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH; // No longer needed for OTP login

// In-memory store for OTPs. For production, consider a more persistent store like Redis.
const otpStore = {};
// Define environment-specific URLs based on the folder path.
const currentDir = __dirname.toLowerCase();
let REGISTER_LINK;
let LOGIN_LINK;
let TRAINING_REGISTER_LINK;
let TRAINING_COURSES_LINK;

if (currentDir.includes('staging_mywebsite')) {
    REGISTER_LINK = 'https://staging.myconsultation.sevenpointfour.in/register.html';
    LOGIN_LINK = 'https://staging.myconsultation.sevenpointfour.in/login.html';
    TRAINING_REGISTER_LINK = 'https://staging.training.arogyanubhutifoundation.in/register';
    TRAINING_COURSES_LINK = 'https://staging.training.arogyanubhutifoundation.in/courses';
} else if (currentDir.includes('mywebsite')) {
    REGISTER_LINK = 'https://myconsultation.sevenpointfour.in/register.html';
    LOGIN_LINK = 'https://myconsultation.sevenpointfour.in/login.html';
    TRAINING_REGISTER_LINK = 'https://training.arogyanubhutifoundation.in/register';
    TRAINING_COURSES_LINK = 'https://training.arogyanubhutifoundation.in/courses';
} else {
    REGISTER_LINK = 'http://localhost:3020/register.html';
    LOGIN_LINK = 'http://localhost:3020/login.html';
    TRAINING_REGISTER_LINK = 'http://localhost:3000/register';
    TRAINING_COURSES_LINK = 'http://localhost:3000/courses';
}
 

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
    service: 'Gmail', // Or your email provider
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

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
    console.log(`DEBUG: Serving ${pageName} with Training Link: ${TRAINING_REGISTER_LINK}`);
    const contentDir = path.join(__dirname, 'content');
    const filePath = path.join(contentDir, `${pageName}.json`);

    try {
        let data = await fs.readFile(filePath, 'utf8');
        // Replace any placeholders with environment-specific values
        data = data.replace(/{{REGISTER_LINK}}/g, REGISTER_LINK);
        data = data.replace(/{{LOGIN_LINK}}/g, LOGIN_LINK);
        data = data.replace(/{{TRAINING_REGISTER_LINK}}/g, TRAINING_REGISTER_LINK);
        data = data.replace(/{{TRAINING_COURSES_LINK}}/g, TRAINING_COURSES_LINK);
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
        if (error.code === 'ENOENT') {
            return res.status(404).json({ error: 'Content not found.' });
        }
        console.error(`Error deleting content for ${pageName}:`, error);
        res.status(500).json({ error: 'Failed to delete content.' });
    }
});

// Admin login
app.post('/api/admin/login', async (req, res) => { // Changed to passwordless OTP login
    const { username } = req.body;
    if (username === ADMIN_USERNAME) {
        try {
            const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
            const expiry = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes

            // Store OTP and its expiry time
            otpStore[username] = { otp, expiry };

            if (process.env.EMAIL_USER) {
                // Send OTP email
                await transporter.sendMail({
                    from: `"SevenPointFour Admin" <${process.env.EMAIL_USER}>`,
                    to: username,
                    subject: 'Your Login Code',
                    text: `Your one-time login code is: ${otp}. It will expire in 10 minutes.`,
                    html: `<p>Your one-time login code is: <b>${otp}</b>. It will expire in 10 minutes.</p>`,
                });
            } else {
                console.log(`SERVER: Simulation OTP ${otp} sent to ${username}`);
            }
            console.log(`SERVER: OTP sent to ${username}`);
            return res.json({ success: true, message: 'A one-time code has been sent to your email.' });
        } catch (error) {
            console.error('Error sending OTP:', error);
            return res.status(500).json({ success: false, error: 'Failed to send OTP. Please try again later.' });
        }
    }

    // Generic error message for security
    console.log(`SERVER: Invalid login attempt for username: ${username}`);
    res.status(401).json({ success: false, error: 'Invalid username.' });
});

// New endpoint to verify OTP and complete login
app.post('/api/admin/verify-otp', (req, res) => {
    const { username, otp } = req.body;
    const storedOtpData = otpStore[username];

    if (storedOtpData && storedOtpData.otp === otp && Date.now() < storedOtpData.expiry) {
        console.log(`SERVER: OTP verification successful for ${username}`);
        delete otpStore[username]; // OTP is single-use, delete it
        res.json({ success: true, token: ADMIN_TOKEN });
    } else {
        console.log(`SERVER: OTP verification failed for ${username}`);
        res.status(401).json({ success: false, error: 'Invalid or expired code.' });
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

app.get('/api/nav-items.json', async (req, res) => {
    const contentDir = path.join(__dirname, 'content');
    const filePath = path.join(contentDir, 'nav-items.json');
    res.sendFile(filePath);
});

app.post('/api/nav-items.json', verifyAdmin, async (req, res) => {
    const contentDir = path.join(__dirname, 'content');
    const filePath = path.join(contentDir, 'nav-items.json');
    fs.writeFile(filePath, JSON.stringify(req.body, null, 2));
    res.send('ok');
});

// handler to get list of images in the public/photos folder, grouped by subfolder
app.get('/api/images.json', async (req, res) => {
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

// New endpoint to download content directory as a zip file
app.get('/api/admin/download-content', verifyAdmin, async (req, res) => {
    const contentDir = path.join(__dirname, 'content');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`;
    const archiveName = `content_backup_${timestamp}.zip`;

    res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${archiveName}"`
    });

    const archive = archiver('zip', {
        zlib: { level: 9 } // Sets the compression level.
    });

    archive.on('error', function (err) {
        console.error('Archive error:', err);
        res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    try {
        await archive.directory(contentDir, 'content'); // Append the content directory to the archive
        await archive.directory(path.join(__dirname, 'public', 'audio'), 'public/audio');
        await archive.directory(path.join(__dirname, 'public', 'photos'), 'public/photos');
        await archive.finalize(); // Finalize the archive (ie we are done adding files but streams may still be flowing)
    } catch (error) {
        console.error('Error zipping content directory:', error);
        res.status(500).send({ error: 'Failed to create content archive.' });
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

async function startServer() {
    // Automatically create symbolic link for safe photos on server
    if (currentDir.includes('staging_mywebsite') || currentDir.includes('mywebsite')) {
        try {
            await fs.symlink('../../../safe_uploads/photos', path.join(__dirname, 'public', 'photos'), 'dir');
            console.log('SERVER: Safe photos link created.');
        } catch (error) {
            if (error.code !== 'EEXIST') console.error('SERVER: Symlink check:', error.message);
        }
    }
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
        console.log(`Serving static files from: ${path.join(__dirname, 'public')}`);
    });
}
startServer();
