const express = require('express');
const path = require('path');
const fs = require('fs').promises; // Node.js File System module with promises

const app = express();
const port = process.env.PORT || 3010; // You can choose any port that's not in use, e.g., 3000

// Middleware to parse JSON bodies. This is important for POST/PUT requests.
app.use(express.json());

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

// API endpoint to POST (save) page content
app.post('/api/page-content/:pageName', async (req, res) => {
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

// Optional: A simple route to check if the server is running
app.get('/ping', (req, res) => {
  res.send('pong');
});

// Fallback to index.html for any route not handled by static files or other routes
// This is useful for single-page applications or to ensure direct navigation to HTML files works.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  console.log(`Serving static files from: ${path.join(__dirname, 'public')}`);
});