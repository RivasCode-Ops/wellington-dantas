/* Wellington Dantas — servidor local para conferir a página antes do push.
 *
 *   node servir.mjs          → http://localhost:5000
 *   node servir.mjs 8080     → outra porta
 *
 * Roda `scripts/gerar.mjs` antes de subir, para que o que você vê no navegador
 * seja exatamente o que o repositório vai publicar.
 *
 * Por que HTTP e não abrir o arquivo direto: `file://` tem origem opaca, sem
 * cabeçalho e sem cache — é um ambiente diferente do de produção, e ambiente
 * simulado não encontra defeito que nasce do ambiente.
 *
 * Zero dependência: só `node:http` e `node:fs`.
 *
 * Riva's Alexandre · 01/09/2026
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PORTA = Number(process.argv[2]) || 5000;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

try {
  execFileSync(process.execPath, [path.join(RAIZ, 'scripts', 'gerar.mjs')], { stdio: 'inherit' });
} catch {
  console.error('gerar.mjs falhou — servindo o index.html como está no disco.');
}

http.createServer((req, res) => {
  const limpo = decodeURIComponent(req.url.split('?')[0]);
  let alvo = path.join(RAIZ, limpo === '/' ? 'index.html' : limpo);

  /* nada fora desta pasta */
  if (!alvo.startsWith(RAIZ)) {
    res.writeHead(403).end('403');
    return;
  }
  if (fs.existsSync(alvo) && fs.statSync(alvo).isDirectory()) alvo = path.join(alvo, 'index.html');

  if (!fs.existsSync(alvo)) {
    const erro = path.join(RAIZ, '404.html');
    res.writeHead(404, { 'content-type': TIPOS['.html'] });
    res.end(fs.existsSync(erro) ? fs.readFileSync(erro) : '404');
    return;
  }

  res.writeHead(200, {
    'content-type': TIPOS[path.extname(alvo).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  res.end(fs.readFileSync(alvo));
}).listen(PORTA, () => {
  console.log(`\n  http://localhost:${PORTA}\n  (ctrl+c para parar)\n`);
});
