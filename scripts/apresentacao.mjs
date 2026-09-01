/* apresentacao.mjs — monta `apresentacao.html`, o guia de aprovação.
 *
 *   node scripts/telas.mjs        (captura as 20 telas do site rodando)
 *   node scripts/apresentacao.mjs (monta a página com elas)
 *
 * Por que gerado e não escrito à mão: as dimensões de cada `<img>` têm que
 * bater com o arquivo, e o arquivo muda a cada captura. Proporção declarada
 * errada já aconteceu uma vez neste projeto — o navegador reserva a caixa
 * errada e a página pula quando a imagem chega. Aqui as medidas vêm de
 * `img/apresentacao/medidas.json`, que o capturador escreve.
 *
 * A página é ADITIVA: não importa `site.css` nem `base.css`, e nenhum arquivo
 * do site é alterado por ela. Os tokens são copiados para dentro, de propósito
 * — uma mudança futura no site não pode quebrar uma peça que já foi enviada ao
 * cliente e que ele pode reabrir semanas depois.
 *
 * O `localStorage` vive SÓ aqui, e a página diz isso na cara. A promessa de
 * "zero cookie, zero rastreador" é do site público; esta peça é outra coisa,
 * e a régua confere que o armazenamento não vazou para lá.
 *
 * Riva's Alexandre · 01/09/2026
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MED = JSON.parse(fs.readFileSync(path.join(RAIZ, 'img', 'apresentacao', 'medidas.json'), 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* --- os 14 cartões ------------------------------------------------------ */
const CARTOES = [
  {
    id: 'manchete', t: 'A manchete e o carimbo', telas: ['01-hero'],
    alt: ['Topo do site: a manchete “A cidade que eu ando é a cidade que eu defendo”, o carimbo “Picos, meu amor” em vermelho e a foto de Wellington Dantas ao microfone'],
    e: 'A primeira tela. A manchete “A cidade que eu ando é a cidade que eu defendo”, com o carimbo “Picos, meu amor” logo abaixo, dentro do mesmo bloco.',
    p: 'É a única frase que todo visitante lê. Ela diz que o mandato é de rua antes de ser de gabinete.',
    aviso: 'A foto do topo é provisória, gerada por computador, e está marcada como tal na própria página. Ela sai no dia em que chegar a fotografia oficial — e o site não vai ao ar em versão definitiva enquanto ela estiver lá.',
  },
  {
    id: 'numeros', t: 'Os números', telas: ['02-numeros'],
    alt: ['Faixa com quatro números: 2.254 votos em 2024, 3× o mais votado da cidade, 1º entre 17 vereadores eleitos, 27 ações registradas'],
    e: '2.254 votos · 3× o mais votado · 1º entre 17 eleitos · 27 ações registradas.',
    p: 'Dá tamanho ao mandato em quatro segundos, sem adjetivo.',
    prot: 'Os três primeiros vêm do TSE. O quarto é a contagem real das ações listadas mais abaixo — se a lista crescer, o número cresce junto. Nenhum deles é estimativa.',
  },
  {
    id: 'origem', t: 'A origem', telas: ['03-origem'],
    alt: ['Seção “Origem” com a linha do tempo: movimento por moradia, FAMCC e MPA, volta à Câmara em 2017, presidência do PT em 2019 e 2.254 votos em 2024'],
    e: 'A linha do tempo — movimento por moradia, FAMCC e MPA, volta à Câmara em 2017, presidência do PT em 2019, 2.254 votos em 2024.',
    p: 'Responde “de onde ele veio” antes que alguém responda por ele.',
    q: 'Falta alguma etapa importante nessa linha?',
  },
  {
    id: 'mulheres', t: 'Mulheres Vivas, Livres e Respeitadas', telas: ['04-bandeira'],
    alt: ['Seção da bandeira do mandato, em fundo escuro, com o dado de feminicídios no Piauí em 2025 e os telefones 190 e 180'],
    e: 'A bandeira do mandato, com o dado de 2025 no Piauí: 37 feminicídios, 22 dentro da própria casa, e 78,4% das vítimas nunca tinham registrado boletim contra o autor. Os telefones 190 e 180 estão na própria seção.',
    p: 'Mostra a pauta com dado, não com frase de efeito.',
    prot: 'O site te coloca como articulador, nunca como realizador. A corrida de agosto foi da Prefeitura e da SEMTAS, e o site diz isso.',
  },
  {
    id: 'entregas', t: 'Entregas, bairro por bairro', telas: ['05-entregas'],
    alt: ['Seção de entregas com a busca preenchida com “Junco” e as três ações registradas naquele bairro, cada uma com instrumento, situação e fonte'],
    e: 'As 27 ações de 2025 e 2026. Cada linha traz o local, o instrumento (requerimento, projeto de lei, decreto), a situação e a fonte — boletim da Câmara com número, ou o Instagram do mandato. Na tela, a busca por “Junco”.',
    p: 'É o coração do site. Quem quer saber o que foi feito na rua dele digita o nome do bairro e vê.',
    prot: 'Nada aparece sem fonte. Inclusive o que está só protocolado aparece como protocolado — o site não chama pedido de entrega. Das 27, 6 estão concluídas, 6 em andamento e 15 protocoladas aguardando resposta.',
  },
  {
    id: 'vazio', t: 'Quando não tem nada', telas: ['06-entregas-vazio'],
    alt: ['A mesma seção com uma busca sem resultado, mostrando o texto que convida a mandar a demanda da rua em vez de deixar a tela em branco'],
    e: 'Quando a busca não acha, o site não fica em branco: diz que a cidade é maior que o levantamento e convida a mandar a demanda da rua.',
    p: 'Transforma a ausência em contato, em vez de virar decepção.',
  },
  {
    id: 'mapa', t: 'O mapa de Picos', telas: ['07-mapa'],
    alt: ['Mapa dos bairros de Picos, com os bairros que têm ação registrada em vermelho e o painel lateral aberto mostrando o que foi pedido e a fonte'],
    e: 'Mapa dos bairros. Vermelho é bairro com ação registrada; passa o cursor ou toca e o painel mostra o que foi pedido e a fonte.',
    p: 'Quem não sabe o nome técnico do que precisa, aponta no mapa.',
    prot: 'Bairro só fica vermelho se tiver ação com fonte. O mapa não pinta bairro por simpatia.',
    q: 'A relação oficial de bairros de Picos ainda precisa ser confirmada com a Prefeitura. O gabinete consegue essa lista?',
  },
  {
    id: 'metodo', t: 'Da reunião de rua até a obra', telas: ['08-como-funciona'],
    alt: ['Seção “Como funciona” com os quatro passos: a comunidade se reúne, a demanda vira proposta, o bairro vota no Orçamento Participativo, a obra sai e fica registrada'],
    e: 'Os quatro passos — a comunidade se reúne, a demanda vira proposta, o bairro vota no Orçamento Participativo, a obra sai e fica registrada.',
    p: 'Explica o método. É o que separa mandato de favor.',
  },
  {
    id: 'camara', t: 'Na Câmara', telas: ['09-camara'],
    alt: ['Seção sobre a Câmara Municipal de Picos, com a composição das 17 cadeiras e o PT em duas'],
    e: 'A composição das 17 cadeiras, com o PT em 2.',
    p: 'Explica por que nem tudo que ele apresenta é aprovado — sem isso, projeto parado parece incompetência.',
  },
  {
    id: 'recursos', t: 'Recursos que chegam a Picos', telas: ['10-recursos'],
    alt: ['Seção de recursos, com R$ 107,7 milhões em emendas destinadas ao município divididos em já aplicado, em execução e ainda por aplicar, e a nota “O que este número não é”'],
    e: 'R$ 107,7 milhões em emendas destinadas ao município entre 2020 e 2026, divididos em já aplicado, em execução e ainda por aplicar. Fonte: portal da Prefeitura, coleta de 1 de setembro de 2026, conferida linha a linha.',
    p: 'Mostra o dinheiro que chega à cidade, sem dizer de quem é o mérito.',
    prot: 'Esta é a seção mais delicada do site, e ela está escrita para te defender. Vereador não apresenta emenda parlamentar — isso é instrumento de deputado e de senador. O site diz isso com todas as letras e não atribui nenhum centavo a ninguém. Se alguém perguntar “ele está se apropriando de emenda?”, a própria página responde que não.',
    q: 'Você quer manter essa seção? Ela é transparência pura e não gera crédito para o mandato. Tirar não quebra nada.',
  },
  {
    id: 'midia', t: 'Na mídia', telas: ['11-midia'],
    alt: ['Seção “Na mídia” com quatro matérias sobre o mandato e os veículos que as publicaram'],
    e: 'Quatro matérias sobre o mandato, com o veículo de cada uma.',
    p: 'Mostra que o mandato existe fora do próprio site.',
    q: 'Os endereços das matérias entram quando o gabinete confirmar a lista do clipping. Existe essa lista?',
  },
  {
    id: 'participe', t: 'Participe', telas: ['12-participe'],
    alt: ['Seção “Participe”, com o convite para mandar o problema da rua e o boneco do vereador ao lado'],
    e: 'O convite para mandar a demanda da rua, hoje pelo Instagram do mandato.',
    p: 'É a porta de entrada da demanda. Daqui a pessoa vai para o Gabinete Aberto, onde o texto sai pronto com bairro e rua.',
    aviso: 'O número de WhatsApp do gabinete e o grupo do bairro entram aqui assim que vocês definirem o canal. Enquanto não define, fica só o Instagram.',
  },
  {
    id: 'trajetoria', t: 'A página “Da rua pra Câmara”', telas: ['13-trajetoria-votos', '14-trajetoria-fecho'],
    alt: ['Cena da trajetória mostrando 2.254 votos em 2024', 'Cena de fecho da trajetória, em vermelho, com “O trabalho não para”'],
    legendas: ['a cena dos votos, com o número contando na tela', 'o fecho, com os botões para entregas e para mandar a demanda'],
    e: 'Uma página separada, em tela cheia, que conta a trajetória em oito cenas. Ela passa sozinha, como um story, e para no fim — não fica em laço. Tem botão de pausar, e segurar o dedo pausa.',
    p: 'É a peça para mandar no WhatsApp e no story. Funciona sozinha, sem o resto do site.',
    prot: 'Se o celular de quem abrir bloquear o script, a página continua legível rolando — não vira tela preta.',
  },
  {
    id: 'assistente', t: 'O assistente Wellington Dantas.IA', telas: ['15-ia-chips', '16-ia-bairro', '17-ia-voto', '18-ia-demanda'],
    alt: [
      'Assistente aberto no estado inicial, com as perguntas prontas em botões',
      'Resposta do assistente sobre o bairro Paraibinha, listando as ações e a fonte de cada uma',
      'Assistente recusando pergunta sobre orientação de voto',
      'Assistente montando o texto de uma demanda com bairro e rua',
    ],
    legendas: [
      'as perguntas prontas, para quem não sabe o que perguntar',
      'pergunta digitada, resposta com as ações e a fonte de cada uma',
      'pediram orientação de voto e ele recusa: “Não oriento voto e não falo de eleição”',
      'quando não sabe responder, ele vira canal: monta o texto da demanda com bairro e rua, e o morador mesmo envia. Nada sai do aparelho de quem digitou',
    ],
    e: 'Um assistente que responde sobre o mandato. Não é inteligência artificial aberta: ele só responde o que está numa base montada à mão, e toda resposta sai com a fonte. O que ele não sabe, ele diz que não sabe.',
    p: 'Atende quem chega com pergunta em vez de com nome de bairro — e recolhe demanda de quem chega com problema.',
    prot: 'Ele não fala em seu nome, não pede voto e não inventa número. A recusa de orientação de voto vem antes de qualquer tentativa de responder.',
  },
  /* Décimo quinto cartão, que a lista de cartões não previa e a lista de telas
   * previa: 19 e 20 estavam capturadas e não apareciam em lugar nenhum. Não é
   * detalhe de arquivo sobrando — é a tela em que a maioria de Picos vai ver
   * este site, e ela não estava sendo submetida a aprovação. */
  {
    id: 'celular', t: 'No celular, que é onde a maioria vai ver', telas: ['19-mobile-home', '20-mobile-mapa'],
    alt: [
      'O topo do site num celular de 390 pixels de largura, com o menu em duas linhas e a foto acima da manchete',
      'O mapa dos bairros no mesmo celular, com o traçado e os bairros marcados',
    ],
    legendas: ['o topo, com o menu completo à vista', 'o mapa dos bairros no mesmo aparelho'],
    e: 'O site inteiro em tela de celular. O menu não some, o mapa continua tocável e nada corta.',
    p: 'É a tela em que a maior parte das pessoas vai abrir o link que você mandar no WhatsApp.',
    prot: 'O menu de celular estava sumindo — a Trajetória e o Gabinete Aberto, que são páginas, ficavam inalcançáveis para quem entrava pelo telefone. Foi corrigido e virou regra automática: o site não publica se o menu sumir de novo.',
  },
];

/* --- a stack e o investimento -------------------------------------------
 *
 * Faltava, e a observação que gerou este bloco está certa: isto não é um site,
 * é um sistema — só que um sistema que hoje não opera nada, e por isso não
 * custa nada. O custo aparece no dia em que o gabinete passar a RECEBER e
 * RESPONDER demanda, porque aí entra banco, canal e gente.
 *
 * Regra deste bloco: nenhum preço inventado. Os valores são ordens de grandeza
 * de tabela pública, marcados como "a confirmar na contratação" — e o
 * honorário fica em branco de propósito, porque é decisão do Rivas e não minha.
 */
const SITE_NO_AR = 'https://rivascode-ops.github.io/wellington-dantas/';

const PECAS = [
  ['Onde o site mora', 'GitHub Pages', 'Guarda o código, verifica antes de publicar e serve a página. Publicar é dar um comando; voltar atrás também.'],
  ['Como ele é construído', 'HTML, CSS e JavaScript escritos à mão', 'Sem framework, sem biblioteca, sem pacote de terceiro. 79 arquivos, 7.671 linhas, <b>zero dependência instalada</b> — nada que possa ser abandonado por quem mantém, invadido pela cadeia de suprimento ou passar a cobrar.'],
  ['De onde vem o conteúdo', 'Quatro planilhas no repositório', 'As 27 ações, os bairros, as emendas e o traçado do mapa. Editar a planilha pela web do GitHub publica o site em cerca de um minuto — sem painel, sem senha, sem banco.'],
  ['O que impede erro no ar', 'A régua de prova — 105 regras', 'Roda a cada publicação. Se qualquer regra reprovar, o site <b>não vai ao ar</b>: número sem fonte, promessa sem dono, link morto, imagem pesada, rastreador, emenda atribuída ao vereador. Cada regra nasceu de um defeito real.'],
  ['O assistente', 'Recuperação sobre base curada', 'Não é inteligência artificial aberta e não usa OpenAI, Google nem nenhuma API. São 17 registros escritos à mão e 22 termos de recusa. Responde instantaneamente e <b>funciona igual para uma pessoa ou para mil</b>.'],
  ['Quem visita', 'Nada é medido', 'Sem Analytics, sem pixel, sem cookie. O preço disso é não saber quantas pessoas entraram; o ganho é não precisar de política de privacidade nem de base legal para tratar dado de ninguém.'],
];

/* As ferramentas por MOMENTO, sem valor nenhum. O cliente precisa entender o
 * que cada peça faz e quando ela entra; quanto custa é conversa de contrato, e
 * misturar as duas coisas faz ele decidir arquitetura olhando preço. */
const FASES = [
  {
    id: 'fase1', t: 'Já está funcionando', quando: 'você pode abrir agora',
    itens: [
      ['Repositório, verificação e publicação', 'GitHub e GitHub Actions'],
      ['Endereço provisório', 'rivascode-ops.github.io/wellington-dantas'],
      ['Conexão segura (cadeado no navegador)', 'certificado automático'],
      ['Geração do conteúdo a partir das planilhas', 'scripts próprios, em Node'],
      ['Captura das telas deste guia', 'script próprio — as imagens se refazem sozinhas quando o site muda'],
    ],
    nota: 'É o que você está vendo. O site já funciona por inteiro, com mapa, mural, assistente e página de trajetória.',
  },
  {
    id: 'fase2', t: 'Entra quando o conteúdo for aprovado', quando: 'para ir ao ar em nome próprio',
    itens: [
      ['Domínio próprio', 'registro.br — o registrador oficial brasileiro'],
      ['E-mail no domínio', 'ex.: contato@wellingtondantas.com.br'],
      ['Cartão de compartilhamento', 'a imagem que aparece quando o link é colado no WhatsApp'],
      ['Tradução para Libras', 'ver o bloco de inclusão logo abaixo'],
    ],
    nota: 'Continua sem servidor rodando, sem banco e sem API sendo chamada — o site é um conjunto de arquivos, e é isso que o torna rápido e difícil de quebrar.',
  },
  {
    id: 'fase3', t: 'Entra quando o gabinete for operar a fila', quando: 'aí sim vira sistema de atendimento',
    itens: [
      ['Banco de dados das demandas', 'para a fila existir de verdade, com protocolo e histórico'],
      ['Login e senha do gabinete', 'quem responde precisa se identificar'],
      ['Painel do gabinete', 'ver, responder e mudar a situação de cada demanda'],
      ['Canal de WhatsApp', 'três caminhos possíveis, logo abaixo'],
      ['Backup e prazo de guarda dos dados', 'obrigação legal a partir daqui'],
      ['Política de privacidade e canal de exclusão', 'LGPD — obrigatório assim que houver dado guardado'],
    ],
    nota: 'É aqui que o site passa a GUARDAR dado de cidadão — nome, telefone, endereço. Essa é a fronteira exata entre "site" e "sistema", e é o que obriga política de privacidade de verdade. Antes disso não há o que proteger porque não há o que guardar.',
  },
];

const CAMINHOS = [
  {
    t: 'A · Como está hoje — o morador envia',
    v: 'já funciona',
    d: 'O site monta o texto com bairro, rua e contato, e a pessoa envia pelo WhatsApp comum do gabinete. Quem atende responde na mão, como já faz.',
    bom: 'Funciona amanhã, sem contratar nada. Nenhum dado de cidadão fica guardado em lugar nenhum.',
    ruim: 'Não há fila nem protocolo real, e o "andamento" depende de alguém anotar. Quando o volume cresce, vira caderno.',
  },
  {
    t: 'B · WhatsApp Business comum + painel do gabinete',
    v: 'o caminho recomendado',
    d: 'O aplicativo gratuito do WhatsApp Business continua sendo o canal, e quem atende registra a demanda num painel simples. A fila passa a existir, com protocolo, situação e histórico.',
    bom: 'É onde o critério de prioridade publicado no site passa a ser cumprível e verificável — deixa de ser promessa e vira processo.',
    ruim: 'Alguém do gabinete precisa passar a demanda para o painel. Não é automático.',
  },
  {
    t: 'C · WhatsApp Business Platform — a API oficial da Meta',
    v: 'só com volume alto',
    d: 'A demanda entra direto no sistema sem ninguém transcrever, e a resposta sai automática quando a situação muda.',
    bom: 'Automático de ponta a ponta. Aguenta volume alto sem contratar gente.',
    ruim: 'Exige verificação de conta comercial, uma provedora intermediária e aprovação dos modelos de mensagem pela Meta, o que leva semanas. <b>Só compensa com volume alto</b> — e um gabinete de vereador começa com volume baixo.',
  },
];

/* --- inclusão ------------------------------------------------------------
 *
 * O que já está feito é medido, não estimado: cada item foi conferido no
 * arquivo. E o que falta está separado do que existe, porque prometer Libras
 * que ainda não está lá seria o mesmo defeito das "promessas sem dono" que o
 * site inteiro foi construído para não cometer. */
const INCLUSAO_FEITO = [
  ['Funciona com o JavaScript desligado', 'O conteúdo já vem escrito na página. Quem usa navegador antigo, conexão ruim ou leitor de tela recebe o texto inteiro, sem esperar.'],
  ['Leitor de tela', 'Toda imagem tem descrição escrita, os títulos seguem a hierarquia certa, e o resultado de cada filtro e busca é anunciado em voz — quem não enxerga sabe quantos itens sobraram.'],
  ['Navegação por teclado', 'Dá para usar o site inteiro sem mouse. Onde o foco está fica visível, e a primeira tecla de cada página pula direto para o conteúdo.'],
  ['Movimento reduzido', 'Quem tem enxaqueca, epilepsia fotossensível ou sensibilidade ao movimento — o que inclui muita pessoa autista — pode desligar animação no próprio aparelho, e o site obedece. A página da trajetória <b>entra pausada</b> e não avança sozinha.'],
  ['Nada toca sozinho com som', 'Sem áudio automático, sem vídeo em laço, sem pisca-pisca.'],
  ['Alvo de toque grande', 'Botões e links com no mínimo 44 pixels de altura, para quem tem tremor, pouca mobilidade fina ou dedo grosso.'],
  ['Contraste e tamanho', 'Texto escuro sobre fundo claro, sem cinza sobre cinza, e a página aumenta de tamanho junto com a configuração do celular.'],
  ['Linguagem simples', 'Frase curta, palavra do dia a dia, sem jargão de repartição. Serve a quem tem deficiência intelectual e a quem só está com pressa.'],
];

const INCLUSAO_FALTA = [
  ['Tradução para Libras', 'Um intérprete virtual no canto da tela traduz o texto da página para Língua Brasileira de Sinais. Existe uma ferramenta pública e gratuita do governo federal para isso, o <b>VLibras</b>, feita para ser instalada em sites públicos.', 'Ela carrega de um servidor do governo, e hoje o site não busca <b>nada</b> fora dele — é o que sustenta a frase "não usa cookie e não tem rastreador". Dá para hospedar a ferramenta no próprio site e manter a promessa, e é o que eu recomendo. Precisa da sua decisão porque muda uma regra que está travada.'],
  ['Vídeo do mandato com legenda e janela de Libras', 'Todo vídeo publicado no mural sai com legenda embutida, e os principais com janela de intérprete.', 'Depende de o gabinete gravar os vídeos — não é código.'],
  ['Versão em leitura fácil', 'Uma segunda versão das páginas principais, com frases ainda mais curtas e um conceito por parágrafo, para pessoas com deficiência intelectual.', 'É trabalho de escrita, não de programação. Entra se vocês quiserem.'],
];

const NAO_FAZ = [
  'Não pede voto e não menciona eleição — você não é candidato agora, e o site respeita isso.',
  'Não atribui emenda parlamentar a você.',
  'Não publica número que não tenha fonte. Onde faltou dado, o site diz que faltou.',
  'Não usa cookie, não tem rastreador e não manda nada para Google, Meta ou qualquer outro. Quem visita não é seguido.',
  'Não chama de entrega o que ainda é pedido.',
];

const PENDENCIAS = [
  { id: 'prazo', t: '“O gabinete responde em até 5 dias úteis”', d: 'Pode publicar essa frase? Sem o aval, ela sai do ar. Promessa publicada sem dono vira cobrança contra quem não a fez.', campo: 'Pode publicar? Em quantos dias?' },
  { id: 'protocolo', t: 'Código de acompanhamento', d: 'Hoje o assistente entrega um código à pessoa, e ele vai na primeira linha do texto que ela envia. Para valer como protocolo de verdade, o gabinete precisa adotá-lo. Adota?', campo: 'Quem registra o código, e onde?' },
  { id: 'canal', t: 'Canal oficial', d: 'WhatsApp do gabinete: qual número, e quem atende?', campo: 'Número e responsável' },
  { id: 'bairros', t: 'Lista oficial de bairros de Picos', d: 'Para completar o mapa e parar de dizer que a lista ainda não está confirmada.', campo: 'Quem no gabinete busca isso?' },
  { id: 'clipping', t: 'Lista do clipping', d: 'Endereços das matérias que já saíram sobre o mandato.', campo: 'Existe a lista? Com quem?' },
  { id: 'foto', t: 'Fotografia oficial em alta', d: 'Fotografia, e só fotografia. Enquanto não chega, o topo do site fica com uma imagem provisória marcada como tal — e a versão definitiva não vai ao ar.', campo: 'Tem foto em estúdio? Quando?' },
  { id: 'obras', t: 'Fotos das entregas concluídas', d: 'O mural tem espaço para foto em cada registro e hoje está vazio. As 6 concluídas primeiro — entrega sem foto é entrega que ninguém vê.', campo: 'Quem fotografa, e a partir de quando?' },
  { id: 'autorizacao', t: 'Autorização de uso das fotos', d: 'A foto da tribuna e a foto da estrada precisam de autorização de quem fotografou.', campo: 'De quem são, e há autorização?' },
];

/* --- montagem ----------------------------------------------------------- */
function imagem(nome, alt) {
  const m = MED[nome];
  if (!m) throw new Error(`falta a medida de ${nome}. Rode: node scripts/telas.mjs`);
  return `<img src="img/apresentacao/${nome}.jpg" alt="${esc(alt)}" width="${m.w}" height="${m.h}" loading="lazy" decoding="async">`;
}

function cartao(c, i) {
  const figs = c.telas.map((nome, k) => {
    const leg = c.legendas && c.legendas[k];
    return `        <figure class="tela">
          ${imagem(nome, c.alt[k])}
          ${leg ? `<figcaption>${esc(leg)}</figcaption>` : ''}
        </figure>`;
  }).join('\n');

  return `    <article class="cartao" id="c-${c.id}" data-item="${c.id}">
      <header class="cartao__cab">
        <p class="cartao__n">${i + 1} de ${CARTOES.length}</p>
        <h2>${esc(c.t)}</h2>
      </header>
      <div class="cartao__telas${c.telas.length > 1 ? ' cartao__telas--multi' : ''}">
${figs}
      </div>
      <div class="cartao__tx">
        <p><b>O que é.</b> ${esc(c.e)}</p>
        <p><b>Para que serve.</b> ${esc(c.p)}</p>
        ${c.prot ? `<p class="prot"><b>O que isso te protege.</b> ${esc(c.prot)}</p>` : ''}
        ${c.aviso ? `<p class="aviso">${esc(c.aviso)}</p>` : ''}
        ${c.q ? `<p class="perg"><b>Pergunta:</b> ${esc(c.q)}</p>` : ''}
      </div>
      <div class="voto" role="group" aria-label="Sua resposta sobre ${esc(c.t)}">
        <button type="button" class="voto__b" data-v="aprovo">Aprovo</button>
        <button type="button" class="voto__b" data-v="ajuste">Aprovo com ajuste</button>
        <button type="button" class="voto__b" data-v="nao">Não usar</button>
        <label class="voto__obs" hidden>
          <span>O que mudar${c.q ? ' — e a resposta da pergunta acima' : ''}:</span>
          <textarea rows="3" data-obs placeholder="Escreva aqui. Vai junto no texto do retorno."></textarea>
        </label>
      </div>
    </article>`;
}

const HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Guia de aprovação — site do mandato de Wellington Dantas</title>
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#F3F5F7">
<link rel="icon" href="img/selo.svg" type="image/svg+xml">
<link rel="stylesheet" href="css/fontes.css">
<link rel="stylesheet" href="css/apresentacao.css">
</head>
<body>

<div class="prog" aria-hidden="true"><div class="prog__f" id="prog-f"></div></div>

<main>

<header class="capa">
  <div class="wrap">
    <p class="olho">Wellington Dantas — site do mandato</p>
    <h1>Antes de ir pro ar,<br>você decide o que fica.</h1>
    <p class="capa__d">Este guia mostra o site pronto, tela por tela, explica para que serve cada parte e pergunta se você aprova. Leva uns 8 minutos. No fim, o guia monta um texto com as suas respostas para você mandar de volta — <b>nada é enviado daqui</b>.</p>
    <p class="capa__c" id="contador" aria-live="polite">0 de ${CARTOES.length} respondidos</p>

    <div class="acesso">
      <p class="acesso__r">O site está no ar agora — pode abrir e mexer</p>
      <p><a class="acesso__l" href="${SITE_NO_AR}" rel="noopener" target="_blank">${SITE_NO_AR.replace(/^https:\/\//, '').replace(/\/$/, '')}</a></p>
      <p class="acesso__n">Endereço <b>provisório</b>, e é assim de propósito: ele não aparece em busca do Google e não é para divulgar ainda. O endereço definitivo, em nome próprio, entra quando você aprovar o conteúdo. As telas deste guia são capturas desse mesmo site — se algo aqui parecer estranho, abra lá e confira.</p>
    </div>

    <p class="capa__g">Suas respostas ficam guardadas <b>só neste navegador</b>, para você poder fechar e voltar depois. Não vão para servidor nenhum. O botão <b>Recomeçar</b>, lá no fim, apaga tudo.</p>
  </div>
</header>

<div class="wrap">
${CARTOES.map(cartao).join('\n')}

  <section class="stack">
    <h2>Por dentro: o que faz isso funcionar</h2>
    <p class="stack__d">Isto não é uma página bonita: é um sistema. Só que um sistema construído para <b>não ter peça que cobre, quebre ou dependa de terceiro</b> — e é por isso que ele custa zero hoje.</p>
    <table class="tab">
      <thead><tr><th>Peça</th><th>O que é</th><th>Custo</th></tr></thead>
      <tbody>
${PECAS.map((p) => `        <tr><th scope="row">${esc(p[0])}<span>${esc(p[1])}</span></th><td>${p[2]}</td><td class="tab__v">${esc(p[3])}</td></tr>`).join('\n')}
      </tbody>
    </table>
    <p class="stack__n"><b>O que isso te protege:</b> nenhuma dessas peças pode aumentar de preço, ser descontinuada ou vazar dado do seu eleitor, porque não há dado sendo guardado e não há serviço de terceiro sendo chamado. O dia em que o GitHub deixar de servir, o site inteiro cabe numa pasta e sobe em qualquer outro lugar em uma tarde.</p>
  </section>

  <section class="custo">
    <h2>As ferramentas, e quando cada uma entra</h2>
    <p class="custo__d">O site já funciona por inteiro <b>sem operar nada</b>. As ferramentas de sistema entram no dia em que o gabinete passar a receber e responder demanda — e a lista abaixo é o que cada momento exige, para vocês verem onde estão hoje e o que falta.</p>
${FASES.map((f) => `    <div class="fase" data-fase="${f.id}">
      <div class="fase__cab">
        <h3>${esc(f.t)}</h3>
        <p class="fase__q">${esc(f.quando)}</p>
      </div>
      <table class="tab">
        <tbody>
${f.itens.map((i) => `          <tr><th scope="row">${esc(i[0])}</th><td>${esc(i[1])}</td></tr>`).join('\n')}
        </tbody>
      </table>
      <p class="fase__n">${esc(f.nota)}</p>
    </div>`).join('\n')}

    <h3 class="custo__h">O canal de WhatsApp: três caminhos</h3>
    <p class="custo__d">É a escolha que mais muda o trabalho do gabinete. Marque a que vocês querem — vai no texto do retorno.</p>
    <div class="cams" role="group" aria-label="Caminho do canal de WhatsApp">
${CAMINHOS.map((c, k) => `      <article class="cam" data-caminho="${k}">
        <h4>${esc(c.t)}</h4>
        <p class="cam__v">${esc(c.v)}</p>
        <p>${esc(c.d)}</p>
        <p class="cam__b"><b>A favor:</b> ${esc(c.bom)}</p>
        <p class="cam__r"><b>Contra:</b> ${c.ruim}</p>
        <button type="button" class="cam__e">Escolher este</button>
      </article>`).join('\n')}
    </div>
    <p class="custo__rec"><b>O que eu recomendo:</b> começar no <b>A</b>, que já está pronto, e passar para o <b>B</b> quando o volume de demanda justificar um painel. O <b>C</b> só compensa com volume alto — e um gabinete de vereador começa com volume baixo.</p>
  </section>

  <section class="incl">
    <h2>Inclusão: quem mais precisa do gabinete é quem mais encontra porta fechada</h2>
    <p class="incl__d">Site de mandato que a pessoa com deficiência não consegue usar exclui exatamente quem depende mais do poder público. O que está na primeira lista <b>já funciona</b> — conferi item por item no código. O que está na segunda <b>ainda não existe</b>, e está separado de propósito: prometer aqui o que não está lá seria o mesmo erro que o site inteiro foi construído para não cometer.</p>

    <h3 class="incl__h">O que já funciona hoje</h3>
    <table class="tab">
      <tbody>
${INCLUSAO_FEITO.map((i) => `        <tr><th scope="row">${esc(i[0])}</th><td>${i[1]}</td></tr>`).join('\n')}
      </tbody>
    </table>

    <h3 class="incl__h">O que ainda não existe, e depende de decisão</h3>
${INCLUSAO_FALTA.map((i) => `    <div class="falta">
      <h4>${esc(i[0])}</h4>
      <p>${i[1]}</p>
      <p class="falta__p"><b>O que trava:</b> ${i[2]}</p>
    </div>`).join('\n')}

    <div class="voto" role="group" aria-label="Sua resposta sobre a tradução em Libras" data-extra="libras" data-titulo="Tradução em Libras">
      <p class="incl__q"><b>Pergunta:</b> vocês querem a tradução em Libras no site?</p>
      <button type="button" class="voto__b" data-v="aprovo">Sim, quero</button>
      <button type="button" class="voto__b" data-v="ajuste">Quero, mas depois</button>
      <button type="button" class="voto__b" data-v="nao">Não usar</button>
      <label class="voto__obs" hidden>
        <span>Observação:</span>
        <textarea rows="3" data-obs placeholder="Escreva aqui. Vai junto no texto do retorno."></textarea>
      </label>
    </div>
  </section>

  <section class="naofaz">
    <h2>O que o site deliberadamente não faz</h2>
    <ul>
${NAO_FAZ.map((l) => `      <li>${esc(l)}</li>`).join('\n')}
    </ul>
    <p class="naofaz__n">Isto é informação, não escolha — não tem botão de aprovar.</p>
  </section>

  <section class="pend">
    <h2>O que ainda depende de vocês</h2>
    <p class="pend__d">São decisões que só o gabinete toma. Marque o que já tem resposta e escreva ao lado — vai junto no texto do retorno.</p>
${PENDENCIAS.map((p) => `    <div class="pend__i" data-pend="${p.id}">
      <label class="pend__c"><input type="checkbox"> <b>${esc(p.t)}</b></label>
      <p>${esc(p.d)}</p>
      <label class="pend__r"><span class="sr">${esc(p.campo)}</span>
        <input type="text" data-resp placeholder="${esc(p.campo)}"></label>
    </div>`).join('\n')}
  </section>

  <section class="fecho">
    <h2>Seu retorno</h2>
    <p>O guia monta o texto abaixo com tudo que você respondeu. Copie e mande de volta pelo WhatsApp — <b>nada sai deste aparelho sozinho</b>.</p>
    <button type="button" class="btn btn--g" id="montar">Montar meu retorno</button>
    <div id="saida" hidden>
      <textarea id="texto" rows="18" readonly aria-label="Texto do seu retorno"></textarea>
      <div class="fecho__ac">
        <button type="button" class="btn" id="copiar">Copiar o texto</button>
        <a class="btn btn--f" id="zap" href="https://wa.me/" rel="noopener" target="_blank">Abrir o WhatsApp</a>
      </div>
      <p class="fecho__n" id="copia-nota" hidden>Não consegui copiar sozinho — o texto acima já está selecionado, é só copiar na mão.</p>
    </div>
    <button type="button" class="lnk" id="recomecar">Recomeçar e apagar minhas respostas</button>
  </section>
</div>

</main>

<footer class="rod">
  <div class="wrap">
    <p>Guia de aprovação · versão de apresentação · 01/09/2026 · as telas são capturas do site real, não desenhos · conteúdo sujeito a validação do gabinete</p>
    <p><b>Riva&rsquo;s Alexandre</b> &copy; 2026<br>Todos os direitos reservados. Este guia e o site que ele apresenta não podem ser reaproveitados sem autorização.</p>
  </div>
</footer>

<script src="js/apresentacao.js" defer></script>
</body>
</html>
`;

const dest = path.join(RAIZ, 'apresentacao.html');
fs.writeFileSync(dest, HTML, 'utf8');

/* versão do CSS e do JS por conteúdo, igual ao resto do site */
let t = fs.readFileSync(dest, 'utf8');
for (const arq of ['css/apresentacao.css', 'js/apresentacao.js']) {
  const p = path.join(RAIZ, arq);
  if (!fs.existsSync(p)) continue;
  const v = crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex').slice(0, 8);
  t = t.replace(new RegExp(`(["'])${arq}(\\?v=[0-9a-f]+)?\\1`, 'g'), `$1${arq}?v=${v}$1`);
}
fs.writeFileSync(dest, t, 'utf8');

console.log(`apresentacao.html — ${CARTOES.length} cartões, ${Object.keys(MED).length} telas, ${PENDENCIAS.length} pendências`);
