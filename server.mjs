// Static server tanpa dependency untuk hasil build Vite (SPA + PWA).
// Jalan di Node 18+; tidak perlu `npm install` di STB.
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(new URL('./public', import.meta.url)))
const PORT = Number(process.env.PORT || 8080)
const HOST = process.env.HOST || '127.0.0.1' // cloudflared di mesin yang sama

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
}
// File yang HARUS selalu di-revalidate supaya update app sampai ke device.
const NO_CACHE = new Set(['/index.html', '/sw.js', '/registerSW.js', '/manifest.webmanifest', '/version.txt'])

function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.[/\\])+/, '')
  const file = join(ROOT, clean)
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return null
  if (existsSync(file) && statSync(file).isFile()) return file
  return null
}

createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return }
  let urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0]
  let file = resolveFile(urlPath)
  // SPA fallback (Vue Router history mode) — kecuali untuk request file statis yang tidak ada.
  if (!file) {
    if (extname(urlPath)) { res.writeHead(404).end('Not found'); return }
    file = resolveFile('/index.html'); urlPath = '/index.html'
  }
  const headers = {
    'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
    'Cache-Control': NO_CACHE.has(urlPath) ? 'no-cache' : 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff'
  }
  res.writeHead(200, headers)
  if (req.method === 'HEAD') { res.end(); return }
  createReadStream(file).pipe(res)
}).listen(PORT, HOST, () => console.log(`kpps-pilkalurah di http://${HOST}:${PORT}`))
