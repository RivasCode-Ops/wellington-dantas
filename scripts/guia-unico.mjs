/* guia-unico.mjs — o guia de aprovação num arquivo só, para MANDAR.
 *
 *   node scripts/apresentacao.mjs   (monta a página que vai ao ar)
 *   node scripts/guia-unico.mjs     (empacota o arquivo que se manda)
 *
 * A página publicada e o arquivo único servem a coisas diferentes, e as duas
 * precisam existir:
 *
 *   O LINK é para quem tem internet boa e vai responder na hora. Atualiza
 *   sozinho quando o site muda.
 *
 *   O ARQUIVO é para mandar no WhatsApp e no e-mail. Abre sem internet,
 *   funciona depois que o link mudar, e não deixa rastro em servidor nenhum —
 *   ninguém precisa saber que o vereador abriu, nem quando. Para uma peça que
 *   pergunta "você aprova?", isso não é detalhe.
 *
 * Tudo dentro: imagens em data URI, CSS, JS e as duas fontes. Zero requisição.
 *
 * O artefato mora FORA do repositório, em d:\tmp — fonte versionada, artefato
 * gerado fora, que é a regra desta pasta. O que se versiona é este script.
 *
 * Riva's Alexandre · 01/09/2026
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = process.env.WD_SAIDA || 'd:/tmp/GUIA-APROVACAO-WELLINGTON-DANTAS.html';

const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const bin = (p) => fs.readFileSync(path.join(RAIZ, p));
const b64 = (p, mime) => `data:${mime};base64,${bin(p).toString('base64')}`;

let html = ler('apresentacao.html');

/* --- fontes dentro do CSS ------------------------------------------------ */
let fontes = ler('css/fontes.css')
  .replace(/url\("\.\.\/fontes\/inter-tight\.woff2"\)/g, `url("${b64('fontes/inter-tight.woff2', 'font/woff2')}")`)
  .replace(/url\("\.\.\/fontes\/instrument-serif\.woff2"\)/g, `url("${b64('fontes/instrument-serif.woff2', 'font/woff2')}")`);

const css = ler('css/apresentacao.css');
const js = ler('js/apresentacao.js');

/* --- as duas folhas e o script viram inline ------------------------------ */
html = html.replace(/<link rel="stylesheet" href="css\/fontes\.css[^"]*">\n?/, '');
html = html.replace(/<link rel="stylesheet" href="css\/apresentacao\.css[^"]*">/,
  `<style>\n${fontes}\n${css}\n</style>`);
html = html.replace(/<script src="js\/apresentacao\.js[^"]*"[^>]*><\/script>/,
  `<script>\n${js}\n</script>`);

/* --- as telas viram data URI --------------------------------------------- */
let n = 0;
html = html.replace(/src="(img\/apresentacao\/[^"]+\.jpg)"/g, (_, arq) => {
  n++;
  return `src="${b64(arq, 'image/jpeg')}"`;
});

/* O ícone também, senão o navegador vai buscá-lo e falha em silêncio. */
html = html.replace(/<link rel="icon"[^>]*>\n?/, '');

/* --- o aviso que só o arquivo precisa ------------------------------------ */
html = html.replace('<p class="capa__g">',
  '<p class="capa__g">Este é o arquivo do guia: ele funciona <b>sem internet</b> e não avisa ninguém que você abriu. ');

if (/https?:\/\/(?!wa\.me)/.test(html.replace(/data:[^"']+/g, ''))) {
  const achado = html.replace(/data:[^"']+/g, '').match(/https?:\/\/[a-z0-9./-]+/i);
  throw new Error(`sobrou endereço externo no arquivo único: ${achado[0]}. Ele tem que abrir sem rede.`);
}

fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(DESTINO, html, 'utf8');

const mb = (fs.statSync(DESTINO).size / 1024 / 1024).toFixed(2);
console.log(`${DESTINO}\n  ${n} telas embutidas · ${mb} MB · abre sem internet`);
