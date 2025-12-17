const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5273;
const HOST = '0.0.0.0';
const TEXT_MD_PATH = path.join(process.cwd(), 'public', 'text.md');

const server = http.createServer((req, res) => {
  // Only handle POST requests to root path
  if (req.method === 'POST' && req.url === '/') {
    let body = '';
    
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        
        if (typeof data.text !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing or invalid "text" field' }));
          return;
        }
        
        // Write to text.md
        fs.writeFileSync(TEXT_MD_PATH, data.text, 'utf-8');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'text.md updated' }));
        
        console.log(`[HTTP Server] Updated text.md (${data.text.length} bytes)`);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
        console.error('[HTTP Server] Error:', error.message);
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, HOST, () => {
  const url = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
  console.log(`[HTTP Server] Server running at ${url}`);
  console.log(`[HTTP Server] Listening on ${HOST}:${PORT}`);
  console.log(`[HTTP Server] POST JSON with {"text":"..."} to update public/text.md`);
});




