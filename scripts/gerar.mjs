/* Wellington Dantas — gerador do conteúdo do site.
 *
 *   node scripts/gerar.mjs
 *
 * Lê `dados/acoes.csv` (a fonte editável) e escreve, dentro do `index.html`,
 * a lista de ações, a grade de bairros e o resumo — entre marcadores.
 * Também publica `dados/acoes.json`, para quem quiser consumir o dado bruto.
 *
 * Por que gerar HTML e não buscar JSON no navegador: a página tem que valer
 * com o JavaScript desligado, sem espera e sem piscar. O site de referência
 * que analisamos busca 91 KB de JSON em toda visita para montar a mesma coisa.
 * Aqui o HTML já sai pronto do repositório; o JS só filtra o que já está lá.
 *
 * Zero dependência: só `node:fs`.
 *
 * Riva's Alexandre · 01/09/2026
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CSV = path.join(RAIZ, 'dados', 'acoes.csv');
const JSON_SAIDA = path.join(RAIZ, 'dados', 'acoes.json');
const HTML = path.join(RAIZ, 'index.html');

/* Os 30 bairros de Picos, na ordem em que aparecem no site. Território é dado
 * estável: fica aqui, não no CSV, para não se repetir em cada linha. */
const BAIRROS = [
  'Aerolândia', 'Altamira', 'Alto da Boa Vista', 'Aroeiras', 'Bela Vista',
  'Belo Norte', 'Boa Sorte', 'Boa Vista', 'Bomba', 'Canto da Várzea',
  'Catavento', 'Centro', 'Conduru', 'DNER', 'Fátima',
  'Ipueiras', 'Jardim Natal', 'Junco', 'Malva', 'Morada do Sol',
  'Paraibinha', 'Paroquial', 'Parque de Exposição', 'Parque Industrial', 'Passagem das Pedras',
  'Pedrinhas', 'Samambaia', 'São José', 'São Sebastião', 'Zona rural',
];

/* Recortes que não são bairro, mas onde a ação acontece. */
const ABRANGENTES = ['Cidade toda', 'Rodovias e acessos', 'Vale do Guaribas'];

const semAcento = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const chave = (s) => semAcento(String(s)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const escapar = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function lerCsv(texto) {
  const linhas = texto.trim().split(/\r?\n/);
  const cab = linhas[0].split(';').map((c) => c.trim());
  return linhas.slice(1).map((linha, i) => {
    const celulas = linha.split(';');
    if (celulas.length !== cab.length) {
      throw new Error(`acoes.csv linha ${i + 2}: ${celulas.length} colunas, esperava ${cab.length}. Ponto-e-vírgula sobrando no texto?`);
    }
    const reg = {};
    cab.forEach((c, j) => { reg[c] = celulas[j].trim(); });
    reg.bairros = reg.bairro.split('|').map((b) => b.trim()).filter(Boolean);
    reg.ano = reg.data.slice(0, 4);
    return reg;
  });
}

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const dataCurta = (iso) => {
  const [a, m, d] = iso.split('-');
  return `${Number(d)} ${MES[Number(m) - 1]} ${a}`;
};

/* --- geração dos blocos ------------------------------------------------- */

function blocoAcoes(acoes) {
  const ordenadas = [...acoes].sort((x, y) => y.data.localeCompare(x.data));
  return ordenadas.map((a) => {
    const chaves = a.bairros.map(chave).join(' ');
    const busca = chave([a.acao, a.local, a.categoria, a.bairros.join(' '), a.instrumento].join(' '));
    return `      <li data-bairros="${chaves}" data-ano="${a.ano}" data-busca="${busca}">
        <span class="ent__ano">${a.ano}</span>
        <div class="ent__c">
          <h3>${escapar(a.acao)}</h3>
          <p>${escapar(a.local)} · <b>${escapar(a.situacao)}</b> · ${escapar(a.instrumento)} · ${dataCurta(a.data)}<br><span class="ent__f">Fonte: ${escapar(a.fonte)}</span></p>
        </div>
        <span class="tag">${escapar(a.categoria)}</span>
      </li>`;
  }).join('\n');
}

function blocoBairros(acoes) {
  const conta = new Map();
  for (const a of acoes) for (const b of a.bairros) conta.set(b, (conta.get(b) || 0) + 1);

  const extras = [...conta.keys()]
    .filter((b) => !BAIRROS.includes(b) && !ABRANGENTES.includes(b))
    .sort((x, y) => x.localeCompare(y, 'pt-BR'));

  const item = (nome) => {
    const n = conta.get(nome) || 0;
    const cls = n > 0 ? ' class="is-on"' : '';
    const rotulo = n > 0 ? ` <em>${n}</em>` : '';
    return `<li${cls}><a href="#entregas" data-filtro="${chave(nome)}">${escapar(nome)}${rotulo}</a></li>`;
  };

  const linhas = [];
  for (let i = 0; i < BAIRROS.length; i += 5) {
    linhas.push('      ' + BAIRROS.slice(i, i + 5).map(item).join(''));
  }
  let saida = linhas.join('\n');

  if (extras.length || ABRANGENTES.some((a) => conta.get(a))) {
    const outros = [...ABRANGENTES.filter((a) => conta.get(a)), ...extras];
    saida += `\n    </ul>\n    <p class="terr__nota">Povoados, conjuntos e recortes que também têm ação registrada:</p>\n    <ul class="terr__g terr__g--sec">\n      ${outros.map(item).join('')}`;
  }
  return saida;
}

/* --- mapa interativo ----------------------------------------------------
 * O SVG entra inline no HTML — dentro de <img> ele seria só uma figura: não
 * recebe hover, clique nem foco, e o CSS não alcança os polígonos.
 *
 * Regra que não se quebra: o vermelho do mapa é derivado do CSV. Se a última
 * ação de um bairro sair do arquivo, ele despinta sozinho. Bairro pintado sem
 * ação registrada é mentira no mapa.
 */
function blocoMapa(acoes) {
  const svgFonte = path.join(RAIZ, 'dados', 'mapa-picos.svg');
  const mapaFonte = path.join(RAIZ, 'dados', 'bairros-mapa.csv');
  if (!fs.existsSync(svgFonte) || !fs.existsSync(mapaFonte)) return '';

  /* k → nome dos polígonos identificados */
  const nomePorK = new Map();
  fs.readFileSync(mapaFonte, 'utf8').trim().split(/\r?\n/).slice(1).forEach((linha) => {
    const [k, nome] = linha.split(';').map((c) => c.trim());
    if (k && nome) nomePorK.set(k, nome);
  });

  /* ações por bairro, pela chave normalizada */
  const porBairro = new Map();
  for (const a of acoes) {
    for (const b of a.bairros) {
      const c = chave(b);
      if (!porBairro.has(c)) porBairro.set(c, []);
      porBairro.get(c).push(a);
    }
  }

  const dados = {};
  for (const [k, nome] of nomePorK) {
    const itens = (porBairro.get(chave(nome)) || [])
      .sort((x, y) => y.data.localeCompare(x.data))
      .map((a) => ({
        ano: a.ano, titulo: a.acao, local: a.local, cat: a.categoria,
        sit: a.situacao, inst: a.instrumento, fonte: a.fonte,
      }));
    dados[k] = { nome, filtro: chave(nome), itens };
  }

  let svg = fs.readFileSync(svgFonte, 'utf8').trim();

  /* pinta e rotula cada polígono a partir da contagem */
  svg = svg.replace(/<path([^>]*?)data-k="([^"]+)"([^>]*?)>/g, (todo, antes, k, depois) => {
    const d = dados[k];
    let attrs = (antes + 'data-k="' + k + '"' + depois);
    if (!d) {
      /* polígono sem nome confirmado: não entra na navegação por teclado */
      attrs = attrs.replace(/\s*tabindex="0"/, '').replace(/\s*role="button"/, '');
      return `<path${attrs} aria-hidden="true">`;
    }
    const n = d.itens.length;
    if (n > 0) attrs = attrs.replace('class="reg"', 'class="reg on"');
    const rotulo = n === 0
      ? `${d.nome}, nenhuma ação registrada`
      : `${d.nome}, ${n} ${n === 1 ? 'ação registrada' : 'ações registradas'}`;
    return `<path${attrs} aria-label="${escapar(rotulo)}">`;
  });

  /* o rótulo escrito no mapa acompanha a pintura */
  const comAcao = new Set(Object.values(dados).filter((d) => d.itens.length).map((d) => d.nome));
  svg = svg.replace(/<text class="lb"([^>]*)>([^<]*)<\/text>/g, (todo, attrs, nome) =>
    comAcao.has(nome) ? `<text class="lb on"${attrs}>${nome}</text>` : todo);

  return `      ${svg}
      <script type="application/json" id="mapa-dados">${JSON.stringify(dados)}</script>`;
}

/* O retrato só entra se o arquivo existir. Enquanto não existe, o hero fica de
 * uma coluna e a página não referencia imagem que não está no repositório —
 * que é o que a régua reprovaria. Gerar os arquivos: scripts/foto.ps1 */
function blocoRetrato() {
  const existe = (n) => fs.existsSync(path.join(RAIZ, 'img', n));

  /* Fotografia primeiro. Só na falta dela entra o provisório — e ele entra
   * dizendo o que é, na legenda e no texto alternativo. Imagem gerada sem
   * rótulo seria retrato falso de pessoa real; com rótulo é o que sempre foi
   * um placeholder de apresentação. */
  const real = existe('wellington-1200.jpg');
  const provisorio = !real && existe('wellington-provisorio-1200.jpg');
  if (!real && !provisorio) return '';

  const base = real ? 'wellington' : 'wellington-provisorio';
  const srcset = existe(`${base}-700.jpg`)
    ? ` srcset="img/${base}-700.jpg 700w, img/${base}-1200.jpg 1200w" sizes="(max-width:900px) 62vw, 390px"`
    : '';

  /* Descrição e legenda da fotografia vêm de dados/retrato.json — texto de
   * foto muda quando a foto muda, e isso não deveria exigir mexer em código. */
  let ficha = {};
  const fichaArq = path.join(RAIZ, 'dados', 'retrato.json');
  if (real && fs.existsSync(fichaArq)) ficha = JSON.parse(fs.readFileSync(fichaArq, 'utf8'));

  const alt = real
    ? (ficha.alt || 'Wellington Dantas, vereador de Picos.')
    : 'Imagem ilustrativa gerada por inteligência artificial, representando o vereador na tribuna. Não é uma fotografia.';
  const legenda = real
    ? escapar(ficha.legenda || '') + (ficha.credito ? ` · <span class="cred">Foto: ${escapar(ficha.credito)}</span>` : '')
    : '<b>Imagem provisória, gerada por IA</b> — entra no lugar dela a fotografia oficial que o gabinete enviar.';

  return `    <figure class="hero__retrato${real ? '' : ' hero__retrato--prov'}">
      <img src="img/${base}-1200.jpg"${srcset} alt="${escapar(alt)}" width="1200" height="1600" fetchpriority="high">
      <figcaption>${legenda}</figcaption>
    </figure>`;
}

function blocoResumo(acoes) {
  const anos = acoes.map((a) => a.ano).sort();
  const bairrosAlcancados = new Set();
  for (const a of acoes) for (const b of a.bairros) if (BAIRROS.includes(b)) bairrosAlcancados.add(b);
  const concluidas = acoes.filter((a) => /conclu|realizada|entregue/i.test(a.situacao)).length;
  return `<b>${acoes.length}</b> ações registradas entre ${anos[0]} e ${anos[anos.length - 1]} — `
    + `${concluidas} concluídas, ${acoes.length - concluidas} em andamento — `
    + `em ${bairrosAlcancados.size} bairros, além das que valem para a cidade toda. `
    + `<span>Cada linha traz o instrumento, a situação e a fonte.</span>`;
}

function trocar(html, marca, conteudo) {
  const ini = `<!--gerado:${marca}-->`;
  const fim = `<!--/gerado:${marca}-->`;
  const i = html.indexOf(ini);
  const f = html.indexOf(fim);
  if (i < 0 || f < 0) throw new Error(`index.html não tem os marcadores de "${marca}".`);
  return html.slice(0, i + ini.length) + '\n' + conteudo + '\n' + html.slice(f);
}

/* --- execução ----------------------------------------------------------- */

const acoes = lerCsv(fs.readFileSync(CSV, 'utf8'));

const json = acoes.map((a) => ({
  id: Number(a.id),
  bairros: a.bairros,
  local: a.local,
  tipo_local: a.tipo_local,
  acao: a.acao,
  categoria: a.categoria,
  data: a.data,
  instrumento: a.instrumento,
  situacao: a.situacao,
  fonte: a.fonte,
  evidencia: a.evidencia,
}));
fs.writeFileSync(JSON_SAIDA, JSON.stringify({ atualizado_em: new Date().toISOString().slice(0, 10), acoes: json }, null, 2) + '\n', 'utf8');

let html = fs.readFileSync(HTML, 'utf8');
/* Assinatura de conteúdo no endereço do CSS e do JS.
 *
 * Sem isto, quem já visitou o site continua com o arquivo antigo em cache
 * depois de uma correção — e vê um layout que não existe mais. É o defeito que
 * a referência resolvia renomeando o arquivo à mão (`style30.css`); aqui o
 * nome não muda, muda a assinatura, e ela é calculada do próprio conteúdo. */
function versionarAssets(html) {
  return html.replace(/(href|src)="((?:css|js)\/[a-z0-9.-]+\.(?:css|js))(?:\?v=[a-z0-9]+)?"/g,
    (todo, attr, arquivo) => {
      const caminho = path.join(RAIZ, arquivo);
      if (!fs.existsSync(caminho)) return todo;
      const hash = crypto.createHash('sha256').update(fs.readFileSync(caminho)).digest('hex').slice(0, 8);
      return `${attr}="${arquivo}?v=${hash}"`;
    });
}

const retrato = blocoRetrato();
html = trocar(html, 'acoes', blocoAcoes(acoes));
html = trocar(html, 'bairros', blocoBairros(acoes));
html = trocar(html, 'resumo', blocoResumo(acoes));
html = trocar(html, 'retrato', retrato);
html = trocar(html, 'mapa', blocoMapa(acoes));
html = versionarAssets(html);
fs.writeFileSync(HTML, html, 'utf8');

console.log(`gerar: ${acoes.length} ações → index.html e dados/acoes.json`);
console.log(retrato ? 'gerar: retrato no hero' : 'gerar: sem retrato (img/wellington-1200.jpg não existe) — hero de uma coluna');
