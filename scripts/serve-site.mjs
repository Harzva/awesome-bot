import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { root } from './engine.mjs';

const publicRoot = resolve(root, 'dist/site');
const port = Number(process.env.AWESOME_BOT_PORT || 8765);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.png': 'image/png' };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const stripped = pathname.startsWith('/awesome-bot/') ? pathname.slice('/awesome-bot'.length) : pathname;
    const target = resolve(publicRoot, `.${stripped}`);
    if (target !== publicRoot && !target.startsWith(`${publicRoot}${sep}`)) throw new Error('Invalid path');
    const file = (await stat(target)).isDirectory() ? resolve(target, 'index.html') : target;
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(body);
  } catch (_) { response.writeHead(404, { 'Content-Type': 'text/plain' }); response.end('Not found'); }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Set AWESOME_BOT_PORT to an available port.` : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Awesome Bot preview: http://127.0.0.1:${port}/awesome-bot/`));
