import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = path.resolve(process.argv[2] || '.');
const port = Number(process.env.PORT || 4173);
const types = { '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.csv':'text/csv; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml' };
http.createServer(async (request,response) => {
  try {
    const requested = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = requested === '/' ? 'index.html' : requested.replace(/^\/+/, '');
    const file = path.resolve(directory, relative);
    if (!file.startsWith(directory + path.sep) && file !== path.join(directory,'index.html')) throw new Error('invalid path');
    const info = await stat(file);
    const target = info.isDirectory() ? path.join(file,'index.html') : file;
    const body = await readFile(target);
    response.writeHead(200, { 'content-type': types[path.extname(target)] || 'application/octet-stream', 'cache-control': target.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600' });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type':'text/plain; charset=utf-8' }); response.end('Not found');
  }
}).listen(port,'0.0.0.0',()=>console.log(`Serving ${directory} on http://0.0.0.0:${port}`));
