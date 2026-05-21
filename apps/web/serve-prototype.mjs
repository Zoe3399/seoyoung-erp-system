import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 5174);

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.ico': 'image/svg+xml; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://localhost:${port}`);
    const pathname = url.pathname === '/' ? '/prototype.html' : url.pathname;
    const resolvedPathname =
      pathname === '/favicon.ico' || pathname === '/favicon.svg' ? '/public/favicon.svg' : pathname;
    const filePath = join(root, resolvedPathname.replace(/^\/+/, ''));
    const body = await readFile(filePath);
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream',
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`경남차유리 프로토타입: http://127.0.0.1:${port}`);
});
