 const express = require('express');
 const path = require('path');
 const fs = require('fs').promises; // Node.js File System module with promises
 require('dotenv').config(); // Load environment variables from .env file
 
 const app = express();
 const port = process.env.PORT || 3010; // You can choose any port that's not in use, e.g., 3000
 
 // Middleware to parse JSON bodies. This is important for POST/PUT requests.
 app.use(express.json());
 
 // Check for required environment variables on startup
 if (!process.env.WEBSITE_ADMIN_TOKEN || !process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
   console.error("FATAL ERROR: Missing required environment variables. Please check your .env file or set them in your environment.");
   process.exit(1); // Exit if configuration is missing
 }
 
 // Admin credentials and token are now loaded from environment variables.
 const ADMIN_TOKEN = process.env.WEBSITE_ADMIN_TOKEN;
 const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
 const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
 
 
 // Serve static files from the "public" directory
 app.use(express.static(path.join(__dirname, 'public')));
 
 // API endpoint to GET page content
 app.get('/api/page-content/:pageName', async (req, res) => {
   const { pageName } = req.params;
   const contentDir = path.join(__dirname, 'content');
   const filePath = path.join(contentDir, `${pageName}.json`);
 
   try {
     const data = await fs.readFile(filePath, 'utf8');
     res.json(JSON.parse(data)); // Send the parsed JSON content
   } catch (error) {
     if (error.code === 'ENOENT') {
       // File not found, which is okay (e.g., first time loading the page)
       res.json({ content: '' }); // Send empty content
     } else {
       console.error(`Error reading content for ${pageName}:`, error);
       res.status(500).json({ error: 'Failed to load content.' });
     }
   }
 });
 
 // Middleware to verify admin token for write operations
 const verifyAdmin = (req, res, next) => {
   const authHeader = req.headers.authorization;
   if (authHeader && authHeader.startsWith('Bearer ')) {
     const token = authHeader.substring(7, authHeader.length); // Extract token after "Bearer "
     if (token === ADMIN_TOKEN) {
       return next(); // Token is valid, proceed
     }
   }
   console.log(`SERVER: Admin verification failed for ${req.method} ${req.originalUrl}. Token provided: ${authHeader ? 'Yes' : 'No'}`);
   res.status(403).json({ error: 'Forbidden: Admin access required.' });
 };
 
 // API endpoint to POST (save) page content
 // Protect this route with admin verification
 app.post('/api/page-content/:pageName', verifyAdmin, async (req, res) => {
   console.log(`SERVER: POST request received for /api/page-content/${req.params.pageName}`); // Add this log
   const { pageName } = req.params;
   const { content } = req.body; // Content sent from the frontend
 
   if (content === undefined) {
     return res.status(400).json({ error: 'Content is missing in the request body.' });
   }
 
   const contentDir = path.join(__dirname, 'content');
   const filePath = path.join(contentDir, `${pageName}.json`);
 
   try {
     await fs.mkdir(contentDir, { recursive: true }); // Ensure 'content' directory exists
     await fs.writeFile(filePath, JSON.stringify({ content: content }, null, 2));
     res.json({ success: true, message: `Content for ${pageName} saved successfully.` });
   } catch (error) {
     console.error(`Error saving content for ${pageName}:`, error);
     res.status(500).json({ error: 'Failed to save content.' });
   }
 });
 
 // API endpoint for admin login
 app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
 
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // Credentials are correct, send back the admin token
    console.log(`SERVER: Admin login successful for user: ${username}`);
    res.json({ success: true, token: ADMIN_TOKEN });
  } else {
    // Invalid credentials
    console.log(`SERVER: Admin login failed for user: ${username}`);
    res.status(401).json({ success: false, error: 'Invalid username or password.' });
  }
 });
 
 
 // Optional: A simple route to check if the server is running
 app.get('/ping', (req, res) => {
   res.send('pong');
 });
 
 // Fallback to index.html for any route not handled by static files or other routes
 // This is useful for single-page applications or to ensure direct navigation to HTML files works.
 app.get('*', (req, res) => {
   // Check if the request is for a file with an extension (like .css, .js, .png)
   // If so, and it wasn't caught by express.static, it's likely a 404 for a static asset.
   // Let express.static handle these, and if it falls through, then it's a 404.
   // This check prevents serving index.html for missing static assets.
   if (path.extname(req.path).length > 0) {
     // If you want to send a specific 404 page for missing assets:
     // res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
     // Or just let it be a 404 handled by the browser/Express default
     return res.status(404).send('Resource not found');
   }
   // For path without extension, assume it's a client-side route and serve index.html
   res.sendFile(path.join(__dirname, 'public', 'index.html'));
 });
 
 app.listen(port, () => {
   console.log(`Server listening at http://localhost:${port}`);
   console.log(`Serving static files from: ${path.join(__dirname, 'public')}`);
 });
 