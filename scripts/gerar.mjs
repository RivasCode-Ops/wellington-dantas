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

/* O território saiu do código e virou dado: dados/localidades.csv.
 *
 * Ele tem uma coluna `tipo` e uma coluna `origem`, e a origem é a palavra que
 * a fonte usa. O boletim escreve "Bairro Morro da Macambira" — então Morro da
 * Macambira é bairro, e estava classificado como povoado porque a lista de 30
 * do mockup não o trazia. "Povoado Morrinhos" e "Povoado Valparaíso" são
 * povoados pela mesma razão, e o Morro da AABB entra como localidade porque a
 * fonte o nomeia entre parênteses, sem chamar de bairro.
 *
 * Com a lista em arquivo, todos os números de território do site saem do mesmo
 * lugar — que era o que faltava para eles pararem de divergir. */
const LOCALIDADES = fs.readFileSync(path.join(RAIZ, 'dados', 'localidades.csv'), 'utf8')
  .trim().split(/\r?\n/).slice(1)
  .map((l) => {
    const [nome, tipo, origem] = l.split(';').map((c) => (c || '').trim());
    return { nome, tipo, origem };
  })
  .filter((x) => x.nome);

const porTipo = (t) => LOCALIDADES.filter((x) => x.tipo === t).map((x) => x.nome);

/* A grade principal mostra bairros e a zona rural, na ordem do arquivo. */
const BAIRROS = [...porTipo('bairro'), ...porTipo('zona')];

/* Recortes que não são lugar: ação que vale para a cidade inteira, trecho de
 * rodovia, região. Contá-los como localidade inflava o número. */
const ABRANGENTES = porTipo('abrangencia');

/* Lugar de verdade que não é bairro: povoado, conjunto, localidade nomeada. */
const OUTROS_LUGARES = [...porTipo('localidade'), ...porTipo('povoado'), ...porTipo('conjunto')];

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
    const rotulo = n > 0 ? ` <em aria-label=\"${n} ${n === 1 ? 'ação registrada' : 'ações registradas'}\">${n}</em>` : '';
    return `<li${cls}><a href="#entregas" data-filtro="${chave(nome)}">${escapar(nome)}${rotulo}</a></li>`;
  };

  const linhas = [];
  for (let i = 0; i < BAIRROS.length; i += 5) {
    linhas.push('      ' + BAIRROS.slice(i, i + 5).map(item).join(''));
  }
  let saida = linhas.join('\n');

  /* Duas listas separadas, porque são duas coisas diferentes: povoado e
   * conjunto são lugar; "cidade toda" e "rodovias" são recorte. Misturar as
   * duas era o que fazia a contagem de localidades inflar. */
  const lugares = extras.filter((b) => !ABRANGENTES.includes(b));
  const recortes = ABRANGENTES.filter((a) => conta.get(a));

  if (lugares.length) {
    saida += `\n    </ul>\n    <p class="terr__nota">Povoados, conjuntos e outras localidades com ação registrada:</p>\n    <ul class="terr__g terr__g--sec">\n      ${lugares.map(item).join('')}`;
  }
  if (recortes.length) {
    saida += `\n    </ul>\n    <p class="terr__nota">Recortes que não são lugar — a ação vale para a cidade, para um trecho de rodovia ou para a região:</p>\n    <ul class="terr__g terr__g--sec">\n      ${recortes.map(item).join('')}`;
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

  /* k → nome do polígono, e o bairro da lista com que ele casa.
   * O desenho e a lista nem sempre usam o mesmo rótulo: o mapa traz
   * "Pantanal / Parque Industrial" onde a lista traz "Parque Industrial", e
   * traz "Marco de Sousa", que não é bairro da lista. Sem a coluna de junção,
   * uma ação em Parque Industrial nunca pintaria o polígono. */
  const nomePorK = new Map();
  const bairroPorK = new Map();
  fs.readFileSync(mapaFonte, 'utf8').trim().split(/\r?\n/).slice(1).forEach((linha) => {
    const [k, nome, lista] = linha.split(';').map((c) => (c || '').trim());
    if (!k || !nome) return;
    nomePorK.set(k, nome);
    bairroPorK.set(k, lista !== undefined && lista !== '' ? lista : nome);
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
    const itens = (porBairro.get(chave(bairroPorK.get(k))) || [])
      .sort((x, y) => y.data.localeCompare(x.data))
      .map((a) => ({
        ano: a.ano, titulo: a.acao, local: a.local, cat: a.categoria,
        sit: a.situacao, inst: a.instrumento, fonte: a.fonte,
      }));
    dados[k] = { nome, filtro: chave(bairroPorK.get(k) || nome), itens };
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
/* Largura e altura reais de um JPEG, lidas do marcador SOF. Vinte linhas para
 * não depender de biblioteca e não cravar dimensão à mão. */
function dimensaoJpeg(arq) {
  if (!fs.existsSync(arq)) return null;
  const b = fs.readFileSync(arq);
  if (b[0] !== 0xFF || b[1] !== 0xD8) return null;
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

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

  /* Dimensão lida do arquivo, não cravada à mão. Estava saindo 1200×1600 num
   * JPEG de 1200×1333: o navegador reserva a caixa pela proporção declarada,
   * então a página pulava no carregamento e o `object-fit` cortava num lugar
   * diferente do desenhado. */
  const dim = dimensaoJpeg(path.join(RAIZ, 'img', `${base}-1200.jpg`)) || { w: 1200, h: 1600 };
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
      <img src="img/${base}-1200.jpg"${srcset} alt="${escapar(alt)}" width="${dim.w}" height="${dim.h}" fetchpriority="high">
      <figcaption>${legenda}</figcaption>
    </figure>`;
}

/* --- as contagens de território -----------------------------------------
 *
 * O site dizia "30 bairros" em três lugares, e o número não se sustentava:
 * a lista tem 30 itens, mas um deles é "Zona rural", que não é bairro — são
 * 29 bairros. E o desenho do mapa tem 29 polígonos, dos quais só 18 com nome
 * confirmado. Eram três medidas diferentes com o mesmo rótulo.
 *
 * Agora cada número é gerado do dado que ele mede, e o texto diz qual medida
 * é. A relação oficial de bairros de Picos continua sendo coisa da Prefeitura;
 * enquanto ela não vem, o site afirma o que pode provar: o que tem na lista.
 */
function contagens() {
  const naLista = BAIRROS.length;
  const semZonaRural = BAIRROS.filter((b) => b !== 'Zona rural').length;
  const mapaArq = path.join(RAIZ, 'dados', 'bairros-mapa.csv');
  let comPoligono = 0;
  if (fs.existsSync(mapaArq)) {
    const nomes = fs.readFileSync(mapaArq, 'utf8').trim().split(/\r?\n/).slice(1)
      .map((l) => (l.split(';')[2] !== undefined && l.split(';')[2].trim() !== '' ? l.split(';')[2] : l.split(';')[1]))
      .map((n) => (n || '').trim())
      .filter(Boolean);
    comPoligono = BAIRROS.filter((b) => nomes.includes(b)).length;
  }
  return { naLista, semZonaRural, comPoligono };
}

function blocoNumeros(acoes) {
  return `      <li><b>${acoes.length}</b><span>ações registradas</span></li>`;
}

function blocoTerritorioNota() {
  const c = contagens();
  return `    <p class="mapa__nota">O traçado cobre os bairros já vetorizados; o cinza-claro é polígono sem nome confirmado. `
    + `Dos <b>${c.semZonaRural} bairros desta lista</b>, <b>${c.comPoligono}</b> já têm polígono no mapa — os outros entram nas próximas rodadas, `
    + `<strong>a começar pelo Junco, que é o bairro com mais ações registradas</strong>. `
    + `O desenho também inclui localidade que não é bairro desta lista, como Marco de Sousa. `
    + `<span>A relação oficial de bairros de Picos ainda precisa ser confirmada com a Prefeitura; esta lista é a que o site cobre hoje. Uma ação pode contar em mais de um lugar — a de iluminação do corredor Paraibinha–Morrinhos–Valparaíso conta nos três —, por isso a soma dos contadores passa das 27.</span></p>\n`
    + `    <h3 class="terr__t">Os ${c.semZonaRural} bairros e a zona rural</h3>`;
}

/* --- recursos que chegam a Picos ----------------------------------------
 *
 * Vereador não apresenta emenda parlamentar. Emenda individual, de bancada, de
 * comissão e de relator são instrumentos de deputado e senador — publicar
 * "R$ X trazidos pelo vereador" seria atribuir a ele número de outra pessoa,
 * conferível em portal público em trinta segundos.
 *
 * Então esta seção não é do mandato: é do território. Ela mostra de onde vem o
 * dinheiro que chega à cidade, com autor e situação, e não atribui nada a
 * ninguém. É a mesma regra do mapa e do chat, aplicada a dinheiro.
 *
 * Empenhado não é pago: a situação entra sempre, e separada.
 */
const brl = (n) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const milhoes = (n) => (n / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function blocoEmendas() {
  const arq = path.join(RAIZ, 'dados', 'emendas.csv');
  if (!fs.existsSync(arq)) return '';

  const linhas = fs.readFileSync(arq, 'utf8').trim().split(/\r?\n/);
  const cab = linhas[0].split(';').map((c) => c.trim());
  const regs = linhas.slice(1).map((l) => {
    const c = l.split(';');
    const o = {};
    cab.forEach((k, i) => { o[k] = (c[i] || '').trim(); });
    o.v = Number(o.valor_reais) || 0;
    return o;
  });

  const total = regs.reduce((s, r) => s + r.v, 0);
  const anos = [...new Set(regs.map((r) => r.ano))].sort();
  const faltando = [];
  for (let a = Number(anos[0]); a <= Number(anos[anos.length - 1]); a++) {
    if (!anos.includes(String(a))) faltando.push(String(a));
  }
  const zerados = regs.filter((r) => r.v === 0);

  const agrupar = (campo) => {
    const m = new Map();
    for (const r of regs) {
      const a = m.get(r[campo]) || { v: 0, n: 0 };
      a.v += r.v; a.n++;
      m.set(r[campo], a);
    }
    return [...m].sort((x, y) => y[1].v - x[1].v);
  };

  const situacoes = agrupar('status');
  const soma = (re) => situacoes.filter(([k]) => re.test(k)).reduce((s, [, a]) => s + a.v, 0);

  /* Três estágios de aplicação, com o rótulo do portal ao lado: a classificação
   * é da Prefeitura, a tradução é do site. "Empenhada" é recurso reservado e
   * ainda não executado — por isso entra em "vai ser", nunca em "foi".
   *
   * Quem mandou cada emenda saiu da página a pedido do cliente: é site de
   * mandato, não vitrine de outro parlamentar. O custo dessa escolha está
   * anotado no aviso, que ficou mais explícito para compensar — sem os nomes,
   * é só ele que impede a leitura de que o dinheiro é do vereador. */
  const estagios = [
    { rotulo: 'Já foi aplicado', re: /conclu/i, origem: 'classificada como concluída no portal' },
    { rotulo: 'Está em execução', re: /parcial|liberada|transfer/i, origem: 'executada parcialmente ou já transferida' },
    { rotulo: 'Ainda vai ser aplicado', re: /empenhada/i, origem: 'empenhada — reservada, ainda não executada' },
  ].map((e) => ({ ...e, v: soma(e.re) }));

  /* Os nomes saem do portal em caixa alta e sem acento — "COM. DA SAUDE",
   * "BANCADA DO PIAUI". Não corrijo: reescrever nome de órgão é inventar
   * grafia que a fonte não tem. A nota embaixo avisa que vêm como estão. */
  const capitular = (s) => s;

  return `      <ul class="rec__n">
${estagios.map((e) => `        <li><b>R$&nbsp;${milhoes(e.v)}&nbsp;mi</b><span>${e.rotulo}<em>${escapar(e.origem)}</em></span></li>`).join('\n')}
      </ul>

      <p class="rec__soma">Somados, <b>R$ ${brl(total)}</b> em ${regs.length} registros entre ${anos[0]} e ${anos[anos.length - 1]}.</p>

      <p class="rec__f"><b>O que este número não é.</b> ${faltando.length ? `O portal não traz nenhum registro de ${faltando.join(', ')}, ` : ''}${zerados.length ? `${zerados.length} ${zerados.length === 1 ? 'registro aparece' : 'registros aparecem'} com valor zero, ` : ''}e o beneficiário nem sempre é a Prefeitura — há associação e entidade com endereço na cidade. ${regs.length} registros para ${Number(anos[anos.length - 1]) - Number(anos[0]) + 1} anos é o que a Prefeitura publicou, não o universo do que chegou à cidade.<br><span>Fonte: Portal de Transparência da Prefeitura Municipal de Picos — Emendas Parlamentares. Coleta de ${regs[0].coletado_em ? dataCurta(regs[0].coletado_em) : 'setembro de 2026'}, conferida linha a linha. A situação de cada recurso é a que consta no portal; a divisão em três estágios é leitura do site.</span></p>`;
}

/* --- mural do Gabinete Aberto -------------------------------------------
 *
 * O protótipo trazia dez registros escritos à mão, com nove protocolos
 * (WD-2025-0011 e vizinhos) que não existem em lugar nenhum, duas situações
 * que o CSV não tem — "Em execução" e "Negado" — e frases de execução
 * inventadas, do tipo "executado pelo FUMIP em 12 dias". Publicar aquilo seria
 * criar histórico público falso de um mandato real.
 *
 * O mural passa a ser uma terceira vista do mesmo CSV que alimenta o mapa e a
 * lista de entregas. O card de "negado" volta no dia em que existir um negado
 * de verdade; enquanto isso, a prova de que o mural não é vitrine são os
 * protocolados de fevereiro de 2025 ainda sem resposta, que estão lá.
 */
function classeSituacao(s) {
  if (/conclu|realizada|entregue/i.test(s)) return 'Concluída';
  if (/negad|arquivad|indeferid/i.test(s)) return 'Negado';
  if (/protocolad/i.test(s)) return 'Protocolado';
  return 'Emexecução';
}

function blocoMural(acoes) {
  return [...acoes]
    .sort((x, y) => y.data.localeCompare(x.data))
    .map((a) => {
      const cls = classeSituacao(a.situacao);
      const busca = semAcento([a.acao, a.local, a.bairros.join(' '), a.categoria, a.instrumento].join(' ')).toLowerCase();
      return `      <li class="card" data-sit="${cls}" data-busca="${escapar(busca)}">
        <div class="card__c">
          <span class="card__s s-${cls}">${escapar(a.situacao)}</span>
          <h3>${escapar(a.acao)}</h3>
          <p>${escapar(a.local)}</p>
          <div class="card__m"><span><b>${escapar(a.bairros[0])}</b> · ${escapar(a.instrumento)} · ${dataCurta(a.data)}</span><span>${escapar(a.fonte)}</span></div>
        </div>
      </li>`;
    }).join('\n');
}

function blocoMuralKpi(acoes) {
  const conta = (cls) => acoes.filter((a) => classeSituacao(a.situacao) === cls).length;
  const linhas = [
    ['Concluída', 'concluídas'],
    ['Emexecução', 'em andamento'],
    ['Protocolado', 'protocoladas, aguardando resposta'],
  ].map((par) => `        <li><b data-c="${conta(par[0])}">0</b><span>${par[1]}</span></li>`);
  return `      <ul class="kpi">\n${linhas.join('\n')}\n      </ul>`;
}

function blocoMuralChips(acoes) {
  const cls = [...new Set(acoes.map((a) => classeSituacao(a.situacao)))];
  const nome = { 'Concluída': 'Concluídas', 'Emexecução': 'Em andamento', 'Protocolado': 'Protocoladas', 'Negado': 'Negadas' };
  return ['        <button type="button" class="chip is-on" data-f="">Todas</button>']
    .concat(cls.map((c) => `        <button type="button" class="chip" data-f="${c}">${nome[c] || c}</button>`))
    .join('\n');
}

function blocoOpcoesBairro() {
  return BAIRROS.map((b) => `              <option>${escapar(b)}</option>`).join('\n')
    + '\n              <option>Outro / povoado</option>';
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

/* O assistente responde por bairro a partir do mesmo CSV que pinta o mapa.
 * Sem este arquivo, quem perguntava "o que foi feito no Junco?" recebia a
 * média das 27 ações — a resposta do conjunto quando a pergunta era do caso. */
const bairrosAssistente = {};
for (const nome of [...BAIRROS, ...ABRANGENTES]) {
  const itens = acoes
    .filter((a) => a.bairros.includes(nome))
    .sort((x, y) => y.data.localeCompare(x.data))
    .map((a) => ({ ano: a.ano, titulo: a.acao, local: a.local, cat: a.categoria, sit: a.situacao, inst: a.instrumento, fonte: a.fonte }));
  bairrosAssistente[chave(nome)] = { nome, filtro: chave(nome), itens };
}
/* localidades que só existem no CSV — povoado, conjunto, morro */
for (const a of acoes) {
  for (const b of a.bairros) {
    if (bairrosAssistente[chave(b)]) continue;
    bairrosAssistente[chave(b)] = {
      nome: b,
      filtro: chave(b),
      itens: acoes.filter((x) => x.bairros.includes(b))
        .sort((x, y) => y.data.localeCompare(x.data))
        .map((x) => ({ ano: x.ano, titulo: x.acao, local: x.local, cat: x.categoria, sit: x.situacao, inst: x.instrumento, fonte: x.fonte })),
    };
  }
}
fs.writeFileSync(path.join(RAIZ, 'dados', 'assistente-bairros.json'),
  JSON.stringify(bairrosAssistente, null, 2) + '\n', 'utf8');

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
html = trocar(html, 'numeros', blocoNumeros(acoes));
html = trocar(html, 'terrnota', blocoTerritorioNota());
html = trocar(html, 'emendas', blocoEmendas());
html = versionarAssets(html);
fs.writeFileSync(HTML, html, 'utf8');

/* --- Gabinete Aberto ---------------------------------------------------- */
const GAB = path.join(RAIZ, 'gabinete-aberto.html');
if (fs.existsSync(GAB)) {
  let gg = fs.readFileSync(GAB, 'utf8');
  gg = trocar(gg, 'mural', blocoMural(acoes));
  gg = trocar(gg, 'mural-kpi', blocoMuralKpi(acoes));
  gg = trocar(gg, 'mural-chips', blocoMuralChips(acoes));
  gg = trocar(gg, 'opcoes-bairro', blocoOpcoesBairro());
  gg = versionarAssets(gg);
  fs.writeFileSync(GAB, gg, 'utf8');
  console.log(`gerar: gabinete-aberto.html — ${acoes.length} itens no mural`);
}

/* --- página da trajetória ---------------------------------------------
 * Os dois números que ela anima vêm do mesmo CSV do resto do site. Número
 * animado cravado à mão é número que envelhece sem ninguém perceber. */
const TRAJ = path.join(RAIZ, 'trajetoria.html');
if (fs.existsSync(TRAJ)) {
  /* "Localidade" é lugar, não recorte. "Cidade toda", "Rodovias e acessos" e
   * "Vale do Guaribas" são abrangências: contá-las como localidade inflava o
   * número e o fazia divergir da lista publicada no território. */
  const locais = new Set();
  for (const a of acoes) for (const b of a.bairros) if (!ABRANGENTES.includes(b)) locais.add(b);
  let t = fs.readFileSync(TRAJ, 'utf8');
  /* Marcador de comentário não vale dentro de atributo: o comentário HTML vira
   * texto literal do valor. Aqui a troca é por id — no atributo e no texto. */
  /* Comentário HTML dentro de atributo não vale: ele vira texto literal do
   * valor e Number() devolve NaN. Comentário como filho do elemento funciona;
   * atributo próprio também. `data-marcador` e não `id`: id é uso único e
   * disputa espaço com âncora de navegação.
   *
   * O número aparece TRÊS vezes na mesma cena e as três trocam juntas: no
   * `data-conta`, que é o alvo da animação; no texto do span que anima, que é
   * o que a página publica antes de qualquer JS; e no espelho `.sr`, que é o
   * que o leitor de tela lê — porque o span que anima é `aria-hidden`. */
  /* A trava testa se o PADRÃO casou, não se o texto mudou. Testar mudança dá
   * falso alarme sempre que o número já está certo — que é o caso comum. */
  const trocas = [
    [/(data-marcador="acoes" data-conta=")\d+(" aria-hidden="true">)\d+(<)/, '$1' + acoes.length + '$2' + acoes.length + '$3'],
    [/(data-marcador="acoes-sr">)\d+(<)/, '$1' + acoes.length + '$2'],
    [/(<span data-marcador="locais">)\d+(<\/span>)/, '$1' + locais.size + '$2'],
  ];
  for (const [re, por] of trocas) {
    if (!re.test(t)) {
      throw new Error(`trajetoria.html: o marcador ${re.source.slice(0, 40)}… não existe mais. O número passaria a envelhecer em silêncio.`);
    }
    t = t.replace(re, por);
  }
  t = versionarAssets(t);
  fs.writeFileSync(TRAJ, t, 'utf8');
  console.log(`gerar: trajetoria.html — ${acoes.length} ações em ${locais.size} localidades`);
}

console.log(`gerar: ${acoes.length} ações → index.html e dados/acoes.json`);
console.log(retrato ? 'gerar: retrato no hero' : 'gerar: sem retrato (img/wellington-1200.jpg não existe) — hero de uma coluna');
