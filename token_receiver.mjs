import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method === 'POST' && req.url === '/auth') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { token } = JSON.parse(body);
        const vercelDir = path.join(process.env.USERPROFILE || process.env.HOME, '.vercel');
        if (!fs.existsSync(vercelDir)) fs.mkdirSync(vercelDir, { recursive: true });
        fs.writeFileSync(path.join(vercelDir, 'auth.json'), JSON.stringify({ token }), 'utf8');
        console.log('AUTH_SAVED');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        server.close();
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(19876, '127.0.0.1', () => {
  console.log('RECEIVER_READY');
});
