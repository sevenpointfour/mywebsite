const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '../dist');
const publicDir = path.join(__dirname, '../public');

// 1. Create/empty the build directory
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
}
fs.mkdirSync(buildDir);

// Function to copy directories recursively
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  let entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    let srcPath = path.join(src, entry.name);
    let destPath = path.join(dest, entry.name);

    entry.isDirectory() ?
      copyDirSync(srcPath, destPath) :
      fs.copyFileSync(srcPath, destPath);
  }
}

// 2. Copy directories
copyDirSync(path.join(publicDir, 'css'), path.join(buildDir, 'css'));
copyDirSync(path.join(publicDir, 'photos'), path.join(buildDir, 'photos'));
copyDirSync(path.join(publicDir, 'js'), path.join(buildDir, 'js'));
copyDirSync(path.join(publicDir, 'audio'), path.join(buildDir, 'audio'));


// 3. Copy all .html files
fs.readdirSync(publicDir).forEach(file => {
  if (file.endsWith('.html')) {
    fs.copyFileSync(path.join(publicDir, file), path.join(buildDir, file));
  }
});

// 4. Copy favicon.ico
fs.copyFileSync(path.join(publicDir, 'favicon.ico'), path.join(buildDir, 'favicon.ico'));

const http = require('http');

const contentDir = path.join(__dirname, '../content');
let skip = new Set(`
        <textarea id="editor" style="min-height: 300px;">
        </textarea>
`.split('\n').map(line => line.trim()));
let patterns = [
  'tinymce',
  'saveButton',
  'status',
  'admin-editor.js'
]
fs.readdirSync(contentDir).forEach(file => {
  if (file.endsWith('.json')) {

    let content = JSON.parse(fs.readFileSync(path.join(contentDir, file), 'utf8'));
    if (content.content) {
      if (typeof content.content === 'string')
        content = content.content;
      else if (Array.isArray(content.content)) {
        content = content.content.join('\n');
      }
    } else {
      fs.mkdirSync(path.join(buildDir, 'content'), { recursive: true });
      fs.copyFileSync(path.join(contentDir, file), path.join(buildDir, 'content', file));
      return;
    }
    const filename = file.replace('.json', '.html');
    const url = `http://localhost:3010/${filename}`;

    http.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        let cleanedBody = body.split('\n').filter(line => !patterns.find(pattern => line.includes(pattern)) && !skip.has(line.trim())).join('\n');
        cleanedBody = cleanedBody.replaceAll('<section class="content-section"></section>', `<section class="content-section">${content}</section>`);
        fs.writeFileSync(path.join(buildDir, filename), cleanedBody);
      });
    }).on('error', (e) => {
      console.error(`Got error: ${e.message}`);
    });
  }
});

let apis =
  [
    '/api/nav-items.json',
    '/api/images.json'
  ]
apis.forEach(api => {
  const url = `http://localhost:3010${api}`;
  http.get(url, (res) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      path.dirname(api) && fs.mkdirSync(path.join(buildDir, path.dirname(api)), { recursive: true });
      fs.writeFileSync(path.join(buildDir, api), body);
    });
  }).on('error', (e) => {
    console.error(`Got error: ${e.message}`);
  });
});

console.log('Build successful!');
