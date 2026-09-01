/* Wellington Dantas — a régua de prova do site.
 *
 *   node verificar.mjs
 *
 * Sai com código 1 se qualquer regra falhar. É o que roda no GitHub Actions
 * antes de publicar: se a régua reprova, o site não vai ao ar.
 *
 * Cada regra aqui nasceu de um defeito real — a maioria, dos defeitos que
 * encontrei no site que serviu de referência (ver ANALISEFUNCIONALREFERENCIA).
 *
 * Zero dependência: só `node:fs`.
 *
 * Riva's Alexandre · 01/09/2026
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { conferir } from './scripts/procedencia.mjs';

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const ler = (p) => fs.readFileSync(path.join(RAIZ, p), 'utf8');
const existe = (p) => fs.existsSync(path.join(RAIZ, p));
const tamanho = (p) => fs.statSync(path.join(RAIZ, p)).size;
const kb = (n) => (n / 1024).toFixed(1) + ' KB';

const falhas = [];
const avisos = [];
const reprovar = (m) => falhas.push(m);
const avisar = (m) => avisos.push(m);

const html = ler('index.html');
const css = ler('css/base.css') + '\n' + ler('css/site.css');
const erro404 = ler('404.html');

/* 1. o HTML gerado bate com o CSV --------------------------------------- */
const linhasCsv = ler('dados/acoes.csv').trim().split(/\r?\n/).length - 1;
const itensHtml = (html.match(/<li data-bairros=/g) || []).length;
if (linhasCsv !== itensHtml) {
  reprovar(`index.html tem ${itensHtml} ações e o CSV tem ${linhasCsv}. Rode: node scripts/gerar.mjs`);
}

/* 2. nenhum link morto --------------------------------------------------- */
const mortos = (html.match(/href="#"/g) || []).length;
if (mortos > 1) reprovar(`${mortos} links href="#" na página. Link que não leva a lugar nenhum não vai ao ar.`);

/* 3. todo arquivo referenciado existe ------------------------------------ */
const refs = [...html.matchAll(/(?:src|href)="([^"#:][^":]*)"/g)].map((m) => m[1]);
for (const ref of new Set(refs)) {
  if (/^(https?:|mailto:|#)/.test(ref)) continue;
  const arquivo = ref.split('?')[0];   /* a assinatura de cache não é parte do caminho */
  if (!existe(arquivo)) reprovar(`index.html aponta para "${arquivo}", que não existe no repositório.`);
}

/* 3b. CSS e JS têm que sair assinados ------------------------------------
 * Sem assinatura no endereço, quem já visitou continua com o arquivo antigo em
 * cache depois de uma correção — e vê um layout que não existe mais. Aconteceu
 * em 01/09/2026: o alinhamento do retrato estava publicado e o navegador servia
 * a versão anterior. */
for (const alvo of ['css/site.css', 'css/base.css', 'js/app.js']) {
  if (!new RegExp(`${alvo.replace('/', '\\/')}\\?v=[a-f0-9]{8}`).test(html)) {
    reprovar(`${alvo} está referenciado sem assinatura de conteúdo. Rode: node scripts/gerar.mjs`);
  }
}

/* 4. cartão de compartilhamento completo (o erro nº 1 da referência) ----- */
for (const tag of ['og:title', 'og:description', 'og:image', 'og:type']) {
  if (!html.includes(`property="${tag}"`)) reprovar(`falta a meta ${tag} — link colado no WhatsApp não abre com prévia.`);
}
if (!html.includes('name="twitter:card"')) reprovar('falta twitter:card.');
/* og:image tem que ser URL absoluta: WhatsApp e Facebook não resolvem caminho
 * relativo, e o card sai sem imagem — num site que circula por WhatsApp, isso
 * derruba o canal principal. */
const og = /property="og:image" content="([^"]+)"/.exec(html);
if (!og) {
  reprovar('sem og:image.');
} else if (!/^https:\/\//.test(og[1])) {
  reprovar(`og:image está relativo ("${og[1]}") — WhatsApp e Facebook exigem URL absoluta, senão o card sai sem imagem.`);
} else {
  const local = og[1].replace(/^https:\/\/[^/]+\/[^/]+\//, '');
  if (!existe(local)) reprovar(`og:image aponta para "${og[1]}", e o arquivo "${local}" não existe no repositório.`);
}
if (!/property="og:url" content="https:\/\//.test(html)) reprovar('falta og:url absoluto.');
if (!/rel="canonical" href="https:\/\//.test(html)) reprovar('falta o link canonical absoluto.');

/* 5. cabeça mínima ------------------------------------------------------- */
if (!/<html lang="pt-BR">/.test(html)) reprovar('falta lang="pt-BR" no <html>.');
if (!/<title>[^<]{10,}<\/title>/.test(html)) reprovar('título ausente ou curto demais.');
if (!/name="description" content="[^"]{60,}"/.test(html)) reprovar('meta description ausente ou curta demais.');

/* 6. toda imagem tem alt ------------------------------------------------- */
for (const img of html.match(/<img[^>]*>/g) || []) {
  if (!/\salt="/.test(img)) reprovar(`<img> sem alt: ${img.slice(0, 70)}…`);
}

/* 7. peso — o defeito mais caro da referência (6,3 MB de home) ----------- */
const primeiraCarga = ['index.html', 'css/fontes.css', 'css/base.css', 'css/site.css', 'js/app.js',
  'fontes/inter-tight.woff2', 'fontes/instrument-serif.woff2'];
let total = 0;
for (const arq of primeiraCarga) {
  if (!existe(arq)) { reprovar(`arquivo da primeira carga ausente: ${arq}`); continue; }
  total += tamanho(arq);
}
if (total > 400 * 1024) reprovar(`primeira carga em ${kb(total)} — o teto é 400 KB.`);

for (const dir of ['img', 'fontes']) {
  for (const arq of fs.readdirSync(path.join(RAIZ, dir))) {
    const t = tamanho(path.join(dir, arq));
    if (t > 250 * 1024) reprovar(`${dir}/${arq} tem ${kb(t)} — nenhum arquivo passa de 250 KB.`);
  }
}

/* 7b. imagem gerada por IA: só provisória, só rotulada, só em apresentação ---
 *
 * Retrato sintético de pessoa real passando por fotografia é falsificação — e
 * falsificação detectável, porque o arquivo gerado traz manifesto C2PA e
 * marca-d'água que qualquer verificador lê. Placeholder de apresentação, dito
 * na cara, é outra coisa: é o que mockup sempre fez.
 *
 * Então a régua não proíbe: condiciona. O arquivo tem que se chamar
 * "provisorio", a página tem que publicar a legenda dizendo o que é, e o site
 * tem que estar em modo apresentação. No dia em que o `noindex` sair — que é o
 * dia em que o site vira público de verdade — a régua barra a publicação
 * enquanto o provisório estiver lá. */
const indexavel = !/name="robots" content="noindex/.test(html);
let temProvisorio = false;

for (const arq of fs.readdirSync(path.join(RAIZ, 'img'))) {
  if (!/\.(png|jpe?g|webp|avif|gif)$/i.test(arq)) continue;
  const r = conferir(path.join(RAIZ, 'img', arq));
  const marcadoProvisorio = /provisorio/i.test(arq);

  if (r.gerada && !marcadoProvisorio) {
    reprovar(`img/${arq} é imagem gerada por IA (${r.codigos.join(', ')}${r.gerador ? ', ' + r.gerador : ''}) e não está marcada como provisória. Renomeie com "provisorio" no nome ou tire do repositório.`);
  }
  if (marcadoProvisorio) {
    temProvisorio = true;
    if (!/Imagem provis[óo]ria, gerada por IA/.test(html)) {
      reprovar(`img/${arq} é provisória e a página não diz isso ao leitor. A legenda do retrato tem que declarar que a imagem é gerada.`);
    }
    if (!/N[ãa]o é uma fotografia/.test(html)) {
      reprovar(`img/${arq} é provisória e o texto alternativo não avisa que não é fotografia — quem usa leitor de tela receberia a imagem como retrato real.`);
    }
  }
}

if (temProvisorio && indexavel) {
  reprovar('há retrato provisório gerado por IA e o site está indexável. Publicação definitiva com retrato sintético de pessoa real não sai daqui: troque pela fotografia oficial antes de tirar o noindex.');
}

/* 8. a régua estética do mockup ------------------------------------------
 * "Zero sombra" quer dizer zero elevação falsa: sombra projetada. O mockup usa
 * `box-shadow:inset` como sublinhado de texto, que é traço, não profundidade.
 * "Zero gradiente" quer dizer zero fundo em degradê. A textura de filetes do
 * topo (`repeating-linear-gradient`) e o esmaecimento por `mask-image` são
 * desenho de linha, não degradê de cor — por isso passam. */
for (const m of css.matchAll(/box-shadow\s*:\s*([^;}]+)/gi)) {
  if (!/\binset\b/i.test(m[1])) reprovar(`sombra projetada no CSS (${m[1].trim()}) — a régua do projeto é zero elevação.`);
}
for (const m of css.matchAll(/^(?!.*mask-image).*?(?<!repeating-)(linear-gradient|radial-gradient)/gim)) {
  reprovar(`gradiente de fundo no CSS (${m[1]}) — a régua do projeto é zero degradê.`);
}
for (const m of css.matchAll(/border-radius:\s*(\d+)px/g)) {
  if (Number(m[1]) > 2) reprovar(`border-radius de ${m[1]}px — o máximo do projeto é 2px.`);
}

/* 9. regra-zero: nada de terceiro no caminho crítico --------------------- */
if (/https?:\/\/fonts\.(googleapis|gstatic)/.test(html + css)) reprovar('fonte remota do Google — as fontes são locais.');
/* `canonical` e `alternate` apontam para uma URL, não carregam recurso — só
 * conta o que o navegador vai buscar para desenhar a página. */
for (const m of html.matchAll(/<(script|link)([^>]*)(?:src|href)="(https?:[^"]+)"/g)) {
  if (m[1] === 'link' && /rel="(canonical|alternate)"/.test(m[2])) continue;
  reprovar(`recurso de terceiro no caminho crítico: ${m[3]}`);
}

/* 10. a página de erro tem que valer sozinha ----------------------------- */
if (!existe('404.html')) reprovar('sem 404.html — link quebrado cairia na página genérica da hospedagem.');
if (/<link[^>]+stylesheet/.test(erro404)) reprovar('404.html depende de CSS externo; ela é servida em qualquer caminho e tem que valer sozinha.');

/* 11. o mapa tem que ser interativo de verdade ---------------------------
 * Dentro de <img> um SVG é só figura: não recebe hover, clique nem foco, e o
 * CSS não alcança os polígonos. Já aconteceu neste repositório. */
if (/<img[^>]+mapa[^>]*>/i.test(html)) reprovar('o mapa está como <img> — dentro de <img> o SVG não recebe interação nem CSS.');
if (!/<svg id="mapa"/.test(html)) reprovar('o SVG do mapa não está inline no HTML.');
if (!/data-k="/.test(html)) reprovar('o mapa não tem polígonos com data-k — nada para o JS ligar.');
if (!/id="mapa-dados"/.test(html)) reprovar('faltam os dados do mapa (script application/json).');

const app = ler('js/app.js');
if (!/Enviar uma demanda deste bairro/.test(app)) {
  reprovar('o painel do mapa não tem estado vazio com chamada — bairro sem registro vira buraco em vez de contato.');
}

/* 12. rótulo do mapa legível na tela -------------------------------------
 * O viewBox tem 2146 de largura e o mapa é servido em torno de 740px: cada
 * unidade do desenho vira ~0,35px. Rótulo abaixo de 34 unidades sai menor que
 * 12px na tela. */
const lb = /\.lb\s*\{[^}]*font-size:\s*(\d+)px/.exec(css);
if (!lb) {
  reprovar('não achei o tamanho do rótulo do mapa (.lb font-size).');
} else if (Number(lb[1]) < 34) {
  reprovar(`rótulo do mapa a ${lb[1]} unidades do viewBox — na largura em que o mapa é servido isso sai com menos de 12px na tela.`);
}
if (!/@media \(max-width:\s*7\d\dpx\)/.test(css)) {
  reprovar('não há ponto de quebra abaixo de 800px — a faixa onde estão os celulares fica sem regra.');
}

/* 13. enquanto é apresentação, não indexa -------------------------------- */
if (!/name="robots" content="noindex/.test(html)) {
  avisar('index.html está indexável. Certo depois da aprovação — errado enquanto é versão de apresentação.');
}

/* --- resultado ---------------------------------------------------------- */
console.log(`\nprimeira carga: ${kb(total)}  ·  ações publicadas: ${itensHtml}`);
for (const a of avisos) console.log(`  aviso   ${a}`);
if (falhas.length === 0) {
  console.log('\n  régua: passou em tudo.\n');
  process.exit(0);
}
console.log('');
for (const f of falhas) console.log(`  REPROVA ${f}`);
console.log(`\n  ${falhas.length} ${falhas.length === 1 ? 'falha' : 'falhas'}. O site não vai ao ar assim.\n`);
process.exit(1);
