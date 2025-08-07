const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8000;

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    let filePath = parsedUrl.pathname;
    
    // Handle routing similar to vercel.json
    if (filePath === '/') {
        filePath = '/index.html';
    } else if (filePath === '/bd') {
        filePath = '/book-details.html';
    } else if (filePath.startsWith('/bd/')) {
        filePath = '/book-details.html';
    }
    
    // Remove leading slash for file system
    filePath = filePath.substring(1);
    
    // Default to index.html if file doesn't exist
    if (!fs.existsSync(filePath)) {
        filePath = 'index.html';
    }
    
    // Get file extension for content type
    const ext = path.extname(filePath);
    let contentType = 'text/html';
    
    switch (ext) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
        case '.json':
            contentType = 'application/json';
            break;
        case '.png':
            contentType = 'image/png';
            break;
        case '.jpg':
            contentType = 'image/jpg';
            break;
        case '.ico':
            contentType = 'image/x-icon';
            break;
    }
    
    // Read and serve the file
    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // File not found, serve index.html (SPA fallback)
                fs.readFile('index.html', (err, content) => {
                    if (err) {
                        res.writeHead(500);
                        res.end('Error loading index.html');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(content);
                    }
                });
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + err.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Routing:');
    console.log('  / → index.html');
    console.log('  /bd → book-details.html');
    console.log('  /bd/* → book-details.html');
}); 