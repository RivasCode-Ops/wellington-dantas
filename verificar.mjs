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

/* 0. o menu não pode sumir no celular ------------------------------------
 *
 * `base.css` escondia `.nav` abaixo de 820px e não punha nada no lugar. No
 * telefone o cabeçalho ficava só com o nome e o botão — e a Trajetória e o
 * Gabinete Aberto, que são páginas e não âncoras, ficavam inalcançáveis. O
 * defeito não aparece em nenhuma medida que a régua já fazia: peso, link morto,
 * arquivo faltando, tudo passava. Só aparece olhando a página estreita.
 *
 * A conferência lê as duas folhas na ordem em que o navegador as lê e olha qual
 * é o ÚLTIMO `display` que cai em `.nav`. Se o último for `none`, o menu está
 * escondido em algum lugar sem substituto. */
{
  const decls = [...css.matchAll(/(^|[},])\s*([^{}]*?\.nav)\s*\{([^}]*)\}/g)]
    .filter((m) => /(^|,)\s*\.nav\s*$/.test(m[2].split(',').pop().trim()) || m[2].trim() === '.nav')
    .map((m) => (m[3].match(/display\s*:\s*([a-z-]+)/) || [])[1])
    .filter(Boolean);
  if (decls.length && decls[decls.length - 1] === 'none') {
    reprovar('o menu (.nav) termina em display:none e nada o substitui. No celular a Trajetória e o Gabinete Aberto são páginas, não âncoras: sem menu, ninguém chega nelas.');
  }
}

/* 0b. a frase de privacidade só vale enquanto for verdade -----------------
 *
 * O rodapé afirma que o site não usa cookie, não tem rastreador e não coleta
 * dado. É a afirmação mais forte que o site faz sobre si mesmo, e é a mais
 * fácil de quebrar sem perceber: basta alguém colar um snippet de Analytics,
 * um pixel, uma fonte do Google ou um `localStorage` de conveniência.
 *
 * Então a frase passa a ser verificada, e não confiada. Enquanto ela estiver
 * escrita: nenhum recurso de terceiro carregado e nenhuma API de armazenamento
 * em uso. Link de saída (Instagram, WhatsApp) não conta — é clique da pessoa,
 * não carga da página, e o próprio rodapé diz isso. */
{
  const paginas = ['index.html', 'gabinete-aberto.html', 'trajetoria.html', 'assistente.html', '404.html']
    .filter((p) => existe(p));
  const afirma = paginas.some((p) => /não usa cookies, não tem rastreador/.test(ler(p)));
  if (afirma) {
    const servidos = [...paginas, 'css/base.css', 'css/site.css', 'css/fontes.css',
      'js/app.js', 'js/assistente-launcher.js', 'js/assistente-motor.js', 'js/assistente-ui.js',
      'js/gabinete.js', 'js/trajetoria.js', 'css/gabinete.css', 'css/trajetoria.css', 'css/assistente.css']
      .filter((f) => existe(f));

    /* carga de terceiro: só o que o navegador busca sozinho */
    const carga = /(?:src\s*=\s*["']|@import\s+(?:url\()?["']?|url\(\s*["']?|fetch\s*\(\s*["'])(https?:)?\/\/([a-z0-9.-]+)/gi;
    for (const f of servidos) {
      for (const m of ler(f).matchAll(carga)) {
        const host = m[2].toLowerCase();
        if (host.endsWith('rivascode-ops.github.io')) continue;
        reprovar(`${f} carrega recurso de terceiro (${host}) e o rodapé afirma que o site não tem rastreador. Ou o recurso sai, ou a frase sai.`);
      }
    }
    for (const f of servidos) {
      const m = ler(f).match(/document\.cookie|localStorage|sessionStorage|indexedDB/);
      if (m) reprovar(`${f} usa ${m[0]} e o rodapé afirma que o site não coleta dados. Ou o armazenamento sai, ou a frase sai.`);
    }
  }
}

/* 0b-bis. o guia de aprovação é peça à parte, e tem que continuar sendo -----
 *
 * `apresentacao.html` usa `localStorage` — é o rascunho das respostas de quem
 * está aprovando, e sem ele a pessoa perde tudo ao fechar a aba. A exceção é
 * legítima, mas é exatamente o tipo de coisa que vaza: alguém acha útil,
 * copia para o site, e a frase "não usa cookies, não tem rastreador" no rodapé
 * do index vira mentira sem ninguém notar.
 *
 * Por isso a exceção é NOMEADA aqui, e não deixada por omissão da lista da
 * regra 0b. E vem com três condições: a página tem que ser noindex, tem que
 * dizer na tela que guarda, e tem que ter como apagar. */
if (existe('apresentacao.html')) {
  const a = ler('apresentacao.html');
  const js = existe('js/apresentacao.js') ? ler('js/apresentacao.js') : '';

  if (!/<meta name="robots" content="noindex/.test(a)) {
    reprovar('apresentacao.html sem noindex. É peça de aprovação do gabinete, não conteúdo público — e ela mostra o site inteiro antes de ele existir.');
  }
  if (!/só neste navegador|neste seu navegador/.test(a)) {
    reprovar('apresentacao.html usa armazenamento e não avisa na tela. Guardar escondido é o que a página inteira existe para não fazer.');
  }
  if (!/id="recomecar"/.test(a)) {
    reprovar('apresentacao.html não tem como apagar o que guardou. Armazenamento sem porta de saída não se justifica nem aqui.');
  }
  if (js && !/try\s*\{[^}]*localStorage/.test(js)) {
    reprovar('js/apresentacao.js toca localStorage fora de try/catch. Em janela anônima ou com dados de site bloqueados o guia inteiro para — e ele é a peça que vai para o cliente.');
  }
  /* o inverso: o site público não pode ter ganhado armazenamento */
  for (const f of ['index.html', 'gabinete-aberto.html', 'trajetoria.html', 'js/app.js', 'js/gabinete.js', 'js/trajetoria.js']) {
    if (existe(f) && /localStorage|sessionStorage|document\.cookie/.test(ler(f))) {
      reprovar(`${f} ganhou armazenamento. A exceção é do guia de aprovação e só dele — no site público a frase do rodapé deixaria de ser verdade.`);
    }
  }
  /* e ela não pode aparecer na navegação do site */
  for (const f of ['index.html', 'gabinete-aberto.html', 'trajetoria.html']) {
    if (existe(f) && /href="apresentacao\.html"/.test(ler(f))) {
      reprovar(`${f} linka apresentacao.html. O guia mostra pendências e decisões internas do gabinete; ele se manda por link direto, não se publica.`);
    }
  }
}

/* 0c. o código da demanda não pode se vender como protocolo ---------------
 *
 * O código `PIC-AAAA-MM-DD-XXXX` nasce no navegador de quem preencheu e não
 * existe em lugar nenhum: nem no site, nem no gabinete. Ele vai na primeira
 * linha do texto, então passa a existir para o gabinete quando a pessoa
 * enviar a mensagem — e só aí.
 *
 * Dizer "é por ele que você cobra a resposta" antes disso é a mesma família do
 * "responde em até 5 dias úteis": promessa publicada sem dono, que quebra na
 * mão de quem acreditou. Quem cobrasse por um código não enviado não seria
 * encontrado por ninguém. */
for (const arq of ['gabinete-aberto.html', 'js/assistente-ui.js', 'js/gabinete.js', 'dados/assistente-base.json']) {
  if (!existe(arq)) continue;
  const t = ler(arq);
  for (const frase of ['cobra a resposta', 'número de protocolo', 'protocolo da sua demanda']) {
    if (t.includes(frase)) {
      reprovar(`${arq} diz "${frase}" sobre o código da demanda. O código nasce no navegador e só existe para o gabinete depois que a pessoa envia a mensagem — cobrar por ele antes disso não leva a lugar nenhum.`);
    }
  }
}

/* 0d. a trajetória tem que sobreviver ao script bloqueado -----------------
 *
 * A peça automática só existe se `js/trajetoria.js` rodar: é ele que põe
 * `modo-auto` na raiz, e é essa classe que empilha as cenas e trava a rolagem.
 * Script bloqueado, quebrado ou lento devolve a versão de rolagem — que é a
 * página inteira, legível.
 *
 * Duas coisas quebram isso, e as duas já quebraram:
 *
 *   `modo-auto` escrito no HTML — aí a página nasce empilhada e, sem JS para
 *   ativar uma cena, fica em branco.
 *
 *   `[data-an]{opacity:0}` fora de `modo-auto` — foi o defeito real: a regra
 *   estava solta, e com o script bloqueado a página nascia com cabeçalho,
 *   foto e mais nada. O fallback existia no papel e não na tela. Só apareceu
 *   quando comparei as duas versões lado a lado. */
if (existe('trajetoria.html') && existe('css/trajetoria.css')) {
  const t = ler('trajetoria.html');
  const c = ler('css/trajetoria.css');
  if (/<html[^>]*class="[^"]*modo-auto/.test(t)) {
    reprovar('trajetoria.html nasce com a classe modo-auto. Ela é do JS: no HTML, a página empilha as cenas sem ninguém para ativar uma e fica em branco com o script bloqueado.');
  }
  /* "solto" = a regra que zera a opacidade sem `.modo-auto` no seletor. Olho os
   * caracteres imediatamente antes de `[data-an]`, e não o começo da linha: a
   * primeira versão desta regra ancorava em `}` ou início de arquivo e passava
   * batido quando havia um comentário antes — que era exatamente o caso. */
  let escondeSolto = false;
  /* Sem os comentários. A primeira versão desta regra se acusou sozinha: o
   * comentário que explica a correção CITA `[data-an]`, o `[^{]*` seguia dali
   * até a primeira chave de verdade e a regra reprovava o arquivo correto.
   * Verificador que lê comentário como código encontra o que ele mesmo
   * escreveu. */
  const semComentario = c.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of semComentario.matchAll(/\[data-an\][^{]*\{([^}]*)\}/g)) {
    if (!/opacity\s*:\s*0/.test(m[1])) continue;
    const antes = semComentario.slice(Math.max(0, m.index - 40), m.index);
    if (!/\.modo-auto[^;{}]*$/.test(antes)) { escondeSolto = true; break; }
  }
  if (escondeSolto) {
    reprovar('css/trajetoria.css esconde [data-an] fora de .modo-auto. Com o script bloqueado a trajetória nasce em opacity:0 — cabeçalho, foto e mais nada.');
  }
  /* `ctrl` é o contêiner do botão de pausa — é ele que carrega o [hidden]. */
  for (const [id, oque] of [['ctrl', 'o controle de pausa'], ['barra', 'a barra de progresso']]) {
    const re = new RegExp(`id="${id}"[^>]*hidden|hidden[^>]*id="${id}"`);
    if (!re.test(t)) reprovar(`trajetoria.html: ${oque} não nasce com [hidden]. Sem JS não há avanço automático, e controle de autoplay que não existe é botão mentiroso.`);
  }
}

/* 0e. a mídia do card, quando existir ------------------------------------
 *
 * O quadro voltou ao card do mural depois de o CSS ficar órfão — o estilo
 * continuava no arquivo e o elemento tinha sumido da montagem. Hoje nenhuma
 * ação tem mídia; estas regras são para o dia em que o gabinete mandar as
 * fotos, que é quando ninguém vai lembrar delas.
 *
 * O `alt` genérico é o defeito mais provável: "foto da obra" não descreve
 * nada e é pior que ausência, porque satisfaz o validador e não a pessoa.
 *
 * O crédito é obrigatório quando o registro NÃO está concluído. É a regra de
 * conteúdo em forma executável: foto de quadra pronta num card de
 * "Requerimento" dá a entender execução, e o crédito é onde se escreve de
 * quem é a obra. */
if (existe('dados/acoes.csv')) {
  const linhas = ler('dados/acoes.csv').trim().split(/\r?\n/);
  const cab = linhas[0].split(';').map((c) => c.trim());
  const iMidia = cab.indexOf('midia');
  if (iMidia < 0) {
    reprovar('dados/acoes.csv não tem a coluna `midia`. O quadro do card volta a ficar sem fonte de dado — foi assim que o CSS de .card__f ficou órfão.');
  } else {
    const GENERICO = /^(foto|imagem|v[íi]deo|foto da obra|imagem da obra|foto do local|sem descri)/i;
    for (const [n, linha] of linhas.slice(1).entries()) {
      const c = linha.split(';').map((x) => x.trim());
      const [arq, alt, credito] = [c[iMidia], c[iMidia + 1], c[iMidia + 2]];
      if (!arq) continue;
      const id = c[0], situacao = c[cab.indexOf('situacao')];
      if (!existe(arq)) reprovar(`acoes.csv id ${id}: a mídia ${arq} não existe no repositório.`);
      if (!alt) reprovar(`acoes.csv id ${id}: mídia sem midia_alt. O texto alternativo descreve o que a imagem mostra.`);
      else if (GENERICO.test(alt) || alt.length < 20) {
        reprovar(`acoes.csv id ${id}: midia_alt "${alt}" é genérico. Descreva o que aparece — "foto da obra" satisfaz o validador e não a pessoa.`);
      }
      const concluida = /conclu|realizada|entregue/i.test(situacao);
      if (!concluida && !credito) {
        reprovar(`acoes.csv id ${id}: registro "${situacao}" com mídia e sem midia_credito. Foto de obra pronta num card que não é entrega dá a entender execução — o crédito é onde se diz de quem é a obra.`);
      }
      if (existe(arq)) {
        const teto = /\.(mp4|webm)$/i.test(arq) ? 3 * 1024 * 1024 : 250 * 1024;
        if (tamanho(arq) > teto) {
          reprovar(`${arq} tem ${kb(tamanho(arq))} e o teto é ${kb(teto)}. O custo não é o do GitHub Pages, é o 4G de quem mora em Picos.`);
        }
      }
      void n;
    }
  }
}

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
  const arquivo = ref.split('?')[0].split('#')[0];   /* nem a assinatura de cache nem a âncora são parte do caminho */
  if (!arquivo) continue;
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

/* Desce nas subpastas. Antes só olhava o primeiro nível, e as 20 capturas do
 * guia de aprovação moram em img/apresentacao/ — o teto simplesmente não
 * alcançava a pasta que mais cresce quando o site muda. */
function pesar(dir) {
  for (const arq of fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true })) {
    const rel = `${dir}/${arq.name}`;
    if (arq.isDirectory()) { pesar(rel); continue; }
    const t = tamanho(rel);
    if (t > 250 * 1024) reprovar(`${rel} tem ${kb(t)} — nenhum arquivo passa de 250 KB.`);
  }
}
for (const dir of ['img', 'fontes']) pesar(dir);

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

/* O mapa vivia branco sobre branco, com contraste 1:1, e o traço media 0,6px
 * na tela porque a espessura escalava junto com o viewBox de 2146. */
if (!/vector-effect:\s*non-scaling-stroke/.test(css)) {
  reprovar('o traço do mapa escala com o viewBox: 2 unidades num viewBox de 2146 viram 0,6px na tela. Falta vector-effect: non-scaling-stroke.');
}
const fillReg = /\.reg\s*\{[^}]*fill:\s*(#[0-9a-f]{3,6})/i.exec(css);
if (fillReg && /^#(fff|ffffff)$/i.test(fillReg[1])) {
  reprovar('os polígonos do mapa são brancos dentro de um cartão branco — contraste 1:1, o desenho some.');
}

/* A caixa reservada da imagem vem da proporção declarada: se ela mentir, a
 * página pula no carregamento e o object-fit corta em outro lugar. */
const heroImg = /<img src="img\/(wellington[a-z-]*)-1200\.jpg"[^>]*width="(\d+)" height="(\d+)"/.exec(html);
if (heroImg) {
  const arq = path.join(RAIZ, 'img', `${heroImg[1]}-1200.jpg`);
  const b = fs.readFileSync(arq);
  let i = 2, real = null;
  while (i < b.length - 9 && !real) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) real = { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    else i += 2 + b.readUInt16BE(i + 2);
  }
  if (real && (real.w !== Number(heroImg[2]) || real.h !== Number(heroImg[3]))) {
    reprovar(`o retrato declara ${heroImg[2]}×${heroImg[3]} e o arquivo tem ${real.w}×${real.h}. Proporção declarada errada faz a página pular e o recorte sair de onde foi desenhado.`);
  }
}

const app = ler('js/app.js');
if (!/Enviar uma demanda deste bairro/.test(app)) {
  reprovar('o painel do mapa não tem estado vazio com chamada — bairro sem registro vira buraco em vez de contato.');
}

/* 12. rótulo do mapa legível na tela -------------------------------------
 * O viewBox tem 2146 de largura e o mapa é servido em torno de 740px: cada
 * unidade do desenho vira ~0,35px. Rótulo abaixo de 34 unidades sai menor que
 * 12px na tela. */
/* O carimbo do hero é vermelho sobre papel: 4,33 de contraste. Isso só passa
 * como texto grande — 24px em peso 700. Abaixo disso, reprova. */
if (/class="carimbo"/.test(html)) {
  const car = /\.carimbo\s*\{[^}]*\}/.exec(css);
  if (!car) reprovar('o carimbo do hero não tem estilo próprio.');
  else {
    const min = /font-size:\s*clamp\(\s*(\d+)px/.exec(car[0]);
    const peso = /font-weight:\s*(\d+)/.exec(car[0]);
    if (!min || Number(min[1]) < 24) reprovar(`o carimbo do hero começa em ${min ? min[1] : '?'}px. Vermelho sobre papel dá 4,33 de contraste e só passa a partir de 24px.`);
    if (!peso || Number(peso[1]) < 700) reprovar('o carimbo do hero perdeu o peso 700 — sem ele, 4,33 de contraste reprova.');
  }
}

const lb = /\.lb\s*\{[^}]*font-size:\s*(\d+)px/.exec(css);
if (!lb) {
  reprovar('não achei o tamanho do rótulo do mapa (.lb font-size).');
} else if (Number(lb[1]) < 34) {
  reprovar(`rótulo do mapa a ${lb[1]} unidades do viewBox — na largura em que o mapa é servido isso sai com menos de 12px na tela.`);
}
if (!/@media \(max-width:\s*7\d\dpx\)/.test(css)) {
  reprovar('não há ponto de quebra abaixo de 800px — a faixa onde estão os celulares fica sem regra.');
}

/* 12a. contagem de território cravada na mão -----------------------------
 * O site dizia "30 bairros" em três lugares e nenhum dos três media a mesma
 * coisa: a lista tem 30 itens, mas um é "Zona rural"; o desenho tem 29
 * polígonos, 18 com nome. Número de território agora é gerado. */
if (/bairros para percorrer/.test(html)) {
  reprovar('a dobra voltou a trazer a contagem de bairros cravada à mão. Esse número é gerado.');
}
if (!/bairros desta lista/.test(html)) {
  reprovar('a nota de território não foi gerada — a página perdeu a contagem que diz o que está medindo.');
}
/* O número publicado tem que bater com o arquivo de localidades, que é a única
 * fonte de território do site. Antes eram três medidas diferentes com o mesmo
 * rótulo; agora, se divergirem, a régua para a publicação. */
if (existe('dados/localidades.csv')) {
  const loc = ler('dados/localidades.csv').trim().split(/\r?\n/).slice(1)
    .map((l) => l.split(';')[1] && l.split(';')[1].trim());
  const nBairros = loc.filter((t) => t === 'bairro').length;
  const publicado = /Dos <b>(\d+) bairros desta lista<\/b>/.exec(html);
  if (!publicado) reprovar('a nota de território não publica a contagem de bairros.');
  else if (Number(publicado[1]) !== nBairros) {
    reprovar(`a página diz ${publicado[1]} bairros e dados/localidades.csv tem ${nBairros}. Rode: node scripts/gerar.mjs`);
  }
  const titulo = /Os (\d+) bairros e a zona rural/.exec(html);
  if (titulo && Number(titulo[1]) !== nBairros) {
    reprovar(`o título da lista diz ${titulo[1]} e o arquivo tem ${nBairros} bairros.`);
  }
}

/* 11b. dado de violência não sai sem porta de saída ----------------------
 * A página publica 37 feminicídios e o percentual de vítimas que nunca
 * registraram ocorrência. Quem chega nessa parte pode estar chegando por um
 * motivo. Número que salva vem junto do número que assusta. */
if (/feminic[íi]dio/i.test(html)) {
  if (!/href="tel:190"/.test(html) || !/href="tel:180"/.test(html)) {
    reprovar('a página publica dado de feminicídio sem os canais de emergência (190 e 180) como link de ligar. Dado de violência não vai ao ar sem porta de saída.');
  }
  if (!/Lei Maria da Penha/.test(html)) {
    reprovar('falta a linha sobre a Lei Maria da Penha: qualquer delegacia é obrigada a registrar e a encaminhar medida protetiva. É a informação que muda o que a pessoa faz depois de ler.');
  }
}

/* 12a-bis. emenda parlamentar não é do vereador --------------------------
 * Vereador não apresenta emenda parlamentar. Publicar a cifra como conquista
 * dele seria atribuir número de outra pessoa — e é conferível em portal
 * público em trinta segundos. A seção de recursos é de contexto: mostra de
 * onde o dinheiro vem, e não diz que alguém o trouxe. */
if (existe('dados/emendas.csv')) {
  /* Sem os nomes dos autores na página, este aviso passou a ser a ÚNICA coisa
   * que impede a leitura de que o dinheiro é do vereador. Por isso a régua
   * exige as duas metades da frase: que não é dele e que não passou por ele. */
  /* Sem os nomes dos autores na página, o texto da nota é a única coisa que
   * separa contexto de apropriação. A régua não exige a frase exata — exige as
   * duas afirmações que fazem o trabalho: que o instrumento não é dele, e que
   * nenhuma emenda do quadro é dele. */
  if (!/quem apresenta é deputado e senador|não apresenta emenda parlamentar/.test(html)) {
    reprovar('a seção de recursos não diz de quem é o instrumento. Sem isso, o quadro de emendas parece do mandato.');
  }
  if (!/Nenhuma emenda deste quadro é minha|Nenhum destes recursos é do vereador/.test(html)) {
    reprovar('a seção de recursos não nega a posse das emendas. É a frase que impede a leitura de que o dinheiro é dele.');
  }
  const ATRIBUICAO = [
    /emendas?[^.]{0,60}(trazidas?|conquistadas?|garantidas?) por (wellington|ele)/i,
    /(wellington|o vereador)[^.]{0,40}(trouxe|conquistou|garantiu|destinou)[^.]{0,30}(emenda|R\$)/i,
    /R\$[^.]{0,40}(trazidos|conquistados) (por|pelo)/i,
  ];
  for (const re of ATRIBUICAO) {
    if (re.test(html)) reprovar(`o site atribui emenda parlamentar ao vereador ("${re.source}"). Ele não é autor de emenda.`);
  }
  /* Empenhado não é pago: o total nunca sai sem a separação por estágio. */
  if (!/Já foi aplicado/.test(html) || !/Ainda vai ser aplicado/.test(html)) {
    reprovar('a seção de recursos publica o total sem separar o que já foi aplicado do que ainda vai ser. Empenhado não é dinheiro na conta.');
  }

  /* Nome de parlamentar não entra: é site de mandato, não vitrine de terceiro.
   * A lista de nomes vem do próprio CSV, então a regra acompanha o dado. */
  const nomes = new Set(
    ler('dados/emendas.csv').trim().split(/\r?\n/).slice(1)
      .map((l) => (l.split(';')[2] || '').trim())
      .filter((n) => n.length > 5)
  );
  for (const nome of nomes) {
    if (html.toUpperCase().includes(nome.toUpperCase())) {
      reprovar(`o nome "${nome}" aparece na página. Nome de parlamentar não entra no site do mandato — nem para dar crédito.`);
    }
  }
}

/* 12b. o assistente ------------------------------------------------------
 * As três regras que o tornam publicável num site de mandato: nada sem fonte,
 * nada de propaganda eleitoral, e nada que atribua realização onde o CSV
 * registra requerimento. Ele não é candidato nesta eleição. */
if (existe('dados/assistente-base.json')) {
  const base = JSON.parse(ler('dados/assistente-base.json'));
  const ia = ler('assistente.html');
  const lanc = ler('js/assistente-launcher.js');

  /* O nome é "Wellington Dantas.IA", inteiro.
   *
   * "Dantas.IA" é curto e cabe melhor, mas ninguém em Picos chama o vereador de
   * Dantas — chamam de Wellington. Assistente que se apresenta por um nome que
   * o eleitor não reconhece não é economia de caractere, é apresentação
   * falhada. A regra pega o nome onde ele é dito ao usuário: o campo de
   * identidade e qualquer arquivo entregue. */
  if (base.identidade.nome_bot !== 'Wellington Dantas.IA') {
    reprovar(`o assistente se apresenta como "${base.identidade.nome_bot}". O nome é "Wellington Dantas.IA" — ninguém conhece o vereador por "Dantas".`);
  }
  for (const arq of ['dados/assistente-base.json', 'assistente.html', 'js/assistente-ui.js',
    'js/assistente-motor.js', 'js/assistente-launcher.js', 'index.html', 'README.md']) {
    if (!existe(arq)) continue;
    if (/(?<!Wellington )Dantas\.IA/.test(ler(arq))) {
      reprovar(`${arq} escreve "Dantas.IA" sem "Wellington" na frente. O nome do assistente é "Wellington Dantas.IA", inteiro.`);
    }
  }

  for (const r of base.registros) {
    const factual = !r.sistema && !r.pendente;
    if (factual && !(r.fonte && String(r.fonte.rotulo || '').trim())) {
      reprovar(`assistente: registro "${r.id}" afirma fato sem fonte. Registro sem fonte é mentira no chat.`);
    }
    if (r.resposta && /<[a-z]/i.test(r.resposta)) {
      reprovar(`assistente: registro "${r.id}" tem HTML na resposta — o texto é renderizado como texto, marcação ali só serve para quebrar.`);
    }
  }

  const todoTexto = base.registros.map((r) => r.resposta || '').join(' \n ');
  const PROPAGANDA = [
    [/\bvote\b/i, 'pedido de voto'],
    [/\bvota[r]? (em|no)\b/i, 'pedido de voto'],
    [/\beleja\b/i, 'pedido de voto'],
    [/\bmeu n[úu]mero [ée]\b/i, 'número como pedido de voto'],
    [/\bvou (fazer|construir|entregar|garantir)\b/i, 'promessa futura'],
    [/\bprometo\b/i, 'promessa futura'],
    [/\beu fiz\b/i, 'primeira pessoa pelo vereador'],
    [/\beu vou\b/i, 'primeira pessoa pelo vereador'],
  ];
  for (const [re, oque] of PROPAGANDA) {
    if (re.test(todoTexto)) reprovar(`assistente: ${oque} no texto do bot ("${re.source}"). Ele não é candidato nesta eleição.`);
  }

  /* O CSV distingue requerimento de entrega. O bot não pode confundir. */
  for (const r of base.registros) {
    if (r.resposta && /\b(entregou|realizou|construiu)\b/i.test(r.resposta)) {
      reprovar(`assistente: registro "${r.id}" atribui realização ao vereador. O verbo tem que ser o da coluna "instrumento" do CSV.`);
    }
  }

  for (const id of base.chips || []) {
    const r = base.registros.find((x) => x.id === id);
    if (!r) reprovar(`assistente: chip "${id}" não existe na base.`);
    else if (r.pendente) reprovar(`assistente: chip "${id}" está pendente e não pode ser oferecido.`);
  }

  if (!/sandbox/.test(lanc)) reprovar('assistente: iframe sem sandbox.');
  /* Sem `allow-forms` o navegador bloqueia a submissão dentro do iframe e o
   * evento submit nunca chega: o assistente fica mudo para quem digita e
   * aperta Enter. E o defeito não aparece em teste com dispatchEvent — só com
   * requestSubmit ou Enter de verdade. */
  if (!/sandbox='[^']*allow-forms|sandbox="[^"]*allow-forms|allow-popups allow-forms/.test(lanc)) {
    reprovar('assistente: sandbox sem allow-forms — quem digita e aperta Enter não recebe resposta.');
  }
  if (!/event\.origin !== location\.origin|e\.origin !== location\.origin/.test(lanc)) {
    reprovar('assistente: postMessage sem checagem de origem.');
  }
  if (!/name="robots" content="noindex/.test(ia)) reprovar('assistente.html está indexável.');

  /* Recusa antes do casamento por palavra-chave. Sem isto, "em quem devo
   * votar?" casava com o gatilho "quem e" e o bot respondia com o número de
   * votos dele — orientação de voto emitida por acidente. */
  if (!base.bloqueios || !base.bloqueios.length) {
    reprovar('o assistente não tem lista de recusa. Pergunta sobre voto e eleição tem que ser recusada antes de qualquer casamento por palavra-chave.');
  } else {
    const termos = base.bloqueios.flatMap((b) => b.termos);
    for (const exigido of ['devo votar', 'em quem votar', 'candidatura', 'eleicao']) {
      if (!termos.includes(exigido)) reprovar(`a lista de recusa do assistente não cobre "${exigido}".`);
    }
  }

  /* O recorte por bairro vem do mesmo CSV que pinta o mapa. */
  if (!existe('dados/assistente-bairros.json')) {
    reprovar('falta dados/assistente-bairros.json — o assistente devolveria a média das 27 ações a quem perguntou por um bairro. Rode: node scripts/gerar.mjs');
  }

  /* Pedir nome e telefone sem dizer para quê é coleta escondida. E enquanto
   * não há backend, a promessa que vale é a verdadeira: nada sai do aparelho
   * sozinho. */
  const ui = ler('js/assistente-ui.js');
  if (/d-nome|d-zap/.test(ui)) {
    if (!/servem só para o gabinete te responder/.test(ui)) {
      reprovar('o assistente pede nome e WhatsApp sem declarar a finalidade ao lado do botão.');
    }
    if (!/o texto é montado neste aparelho e quem envia é você/.test(ui)) {
      reprovar('o assistente pede dado pessoal sem dizer que nada é enviado daqui. Enquanto não há backend, essa frase é o que torna o pedido honesto.');
    }
  }
  if (/innerHTML\s*=/.test(ler('js/assistente-ui.js').replace(/botao\.innerHTML[^\n]*/g, ''))) {
    reprovar('assistente: innerHTML na renderização de mensagem — o texto da base tem que ir por textContent.');
  }
}

/* 12c. a página da trajetória --------------------------------------------
 * Ela anima números. Número animado cravado à mão envelhece sem ninguém
 * perceber — então o que ela conta tem que bater com o CSV. */
if (existe('trajetoria.html')) {
  const traj = ler('trajetoria.html');
  const n = /data-marcador="acoes" data-conta="(\d+)"/.exec(traj);
  if (!n) reprovar('trajetoria.html perdeu o data-marcador do contador de ações — ele deixaria de ser gerado e envelheceria em silêncio.');
  else if (Number(n[1]) !== linhasCsv) reprovar(`a trajetória conta ${n[1]} ações e o CSV tem ${linhasCsv}. Rode: node scripts/gerar.mjs`);

  for (const tag of ['og:title', 'og:image', 'og:url']) {
    if (!traj.includes(`property="${tag}"`)) reprovar(`trajetoria.html sem ${tag}.`);
  }
  if (!/rel="canonical" href="https:\/\//.test(traj)) reprovar('trajetoria.html sem canonical absoluto.');
  /* A saída da peça imersiva. Era um link `.voltar` solto no canto; agora é a
   * marca do cabeçalho, que diz "Voltar ao site" na segunda linha e tem 44px
   * de altura de toque. A regra passou a medir a SAÍDA e não a classe: o que
   * não pode existir é página imersiva que prenda quem entrou. */
  const saida = /class="marca" href="index\.html"/.test(traj) && /Voltar ao site/.test(traj);
  if (!saida) reprovar('trajetoria.html sem caminho de volta ao site — página imersiva não pode prender ninguém. A marca do topo tem que apontar para index.html e dizer "Voltar ao site".');
  if (!/<main/.test(traj)) reprovar('trajetoria.html sem marco principal.');
  if (!/rod-traj/.test(traj)) reprovar('trajetoria.html sem rodapé com fonte e aviso de versão.');

  /* O número nasce escrito no HTML: a página não pode publicar "0 votos".
   * E o span que anima é aria-hidden, com espelho para o leitor de tela. */
  if (/data-conta="\d+"[^>]*>0</.test(traj)) {
    reprovar('trajetoria.html publica 0 num contador. O número nasce estático no HTML; quem zera é o JS, e só fora da tela.');
  }
  const sr = /data-marcador="acoes-sr">(\d+)</.exec(traj);
  if (!sr) reprovar('trajetoria.html sem o espelho acessível do contador — o leitor de tela leria a contagem.');
  else if (Number(sr[1]) !== linhasCsv) reprovar(`o espelho acessível diz ${sr[1]} e o CSV tem ${linhasCsv}.`);
  if (!/data-conta="\d+" aria-hidden="true"/.test(traj)) {
    reprovar('o contador da trajetória não está aria-hidden: o leitor de tela anunciaria cada passo da contagem.');
  }
  if (/@font-face/.test(ler('css/trajetoria.css'))) {
    reprovar('css/trajetoria.css reembute as fontes; elas já são servidas por css/fontes.css.');
  }
  for (const m of traj.matchAll(/(?:src|href)="((?:css|js|img)\/[^"?]+)/g)) {
    if (!existe(m[1])) reprovar(`trajetoria.html aponta para "${m[1]}", que não existe.`);
  }
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
