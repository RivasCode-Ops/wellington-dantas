/* Trajetória, comportamento — "Da rua pra Câmara".
 *
 * Oito cenas, uma por vez, tela cheia, avanço automático, ~38 segundos, e
 * PARA no fim. Sem loop: loop infinito é o que faz a pessoa fechar a aba.
 *
 * PROGRESSIVE ENHANCEMENT, e é inegociável. O HTML continua sendo a versão de
 * rolagem. Quem empilha as cenas e trava o scroll é a classe `modo-auto`, que
 * só existe se este arquivo rodar. Script bloqueado, quebrado ou lento: a
 * página é a de sempre e continua legível rolando. Peça que vira tela preta
 * quando um script falha não vai para o WhatsApp de ninguém.
 *
 * SEM VÍDEO DE FUNDO, e o número é o argumento: 21 fps medidos no site
 * tocomciro111.com em 01/09/2026, com vídeo rodando — e o contador de lá está
 * codado certo, em requestAnimationFrame. A suavidade é refém do orçamento de
 * quadros da página inteira. Aqui só animam transform e opacity.
 *
 * Riva's Alexandre · 01/09/2026
 */
(function () {
  'use strict';

  var cenas = [].slice.call(document.querySelectorAll('[data-cena]'));
  if (cenas.length < 2) return;

  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raiz = document.documentElement;

  /* Os números nascem escritos no HTML — 2.254, 3, 27 — e este é o único lugar
   * que os apaga. Antes de qualquer coisa, guardamos o valor final; a cena que
   * ainda não entrou é zerada, e só ela.
   *
   * É o defeito que medimos na referência: lá o contador mostra o número
   * final, cai para zero e sobe, 351 ms com o valor certo na tela antes do
   * reset. O erro é de ordem — zerar na hora em que a cena entra, não no
   * carregamento. Com autoplay o custo é maior: a cena dos 2.254 votos podia
   * abrir em tela cheia mostrando "0 votos". */
  var contadores = [].slice.call(document.querySelectorAll('[data-conta]'));
  contadores.forEach(function (n) { n.dataset.final = n.textContent; });

  function contar(cena, animar) {
    cena.querySelectorAll('[data-conta]').forEach(function (n) {
      if (n.dataset.feito) return;
      n.dataset.feito = '1';
      var alvo = +n.dataset.conta;
      if (!animar) { n.textContent = n.dataset.final; return; }
      var ini = null, dur = alvo > 100 ? 1200 : 700;
      n.textContent = '0';
      requestAnimationFrame(function passo(t) {
        if (!ini) ini = t;
        var p = Math.min((t - ini) / dur, 1);
        var e = 1 - Math.pow(1 - p, 3);
        n.textContent = p < 1 ? Math.round(alvo * e).toLocaleString('pt-BR') : n.dataset.final;
        if (p < 1) requestAnimationFrame(passo);
      });
    });
  }

  /* --- modo automático --------------------------------------------------- */

  raiz.classList.add('modo-auto');
  if (reduz) raiz.classList.add('modo-seco');

  var barra = document.getElementById('barra');
  var ctrl = document.getElementById('ctrl');
  var nota = document.getElementById('ctrl-nota');
  var botao = document.getElementById('pausar');
  var anuncio = document.getElementById('anuncio');
  var rever = document.getElementById('rever');
  [barra, ctrl].forEach(function (e) { if (e) e.hidden = false; });

  /* A barra: um segmento por cena, clicável. Reaproveita o vermelho do trilho.
   * O trilho de rolagem sai — ele media rolagem, e não há mais rolagem. */
  var trilho = document.querySelector('.trilho');
  if (trilho) trilho.hidden = true;

  var segs = cenas.map(function (c, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'barra__s';
    b.setAttribute('aria-label', 'Ir para a cena ' + (i + 1) + ': ' + (c.dataset.nome || ''));
    b.innerHTML = '<span class="barra__f"></span>';
    b.addEventListener('click', function () { irPara(i, true); });
    barra.appendChild(b);
    return b.firstChild;
  });

  var atual = -1;
  var pausado = reduz;
  var t0 = 0;          /* quando a cena atual começou a contar */
  var decorrido = 0;   /* quanto dela já correu antes da última pausa */
  var quadro = null;   /* rAF: pinta a barra */
  var relogio = null;  /* setTimeout: manda avançar */

  function duracao(i) { return +(cenas[i].dataset.t || 0); }

  function irPara(i, saltado) {
    if (i < 0 || i >= cenas.length) return;
    if (atual === i) return;
    if (atual >= 0) cenas[atual].classList.remove('is-ativa', 'is-vis');
    atual = i;
    var c = cenas[i];

    /* O zero acontece ANTES de a cena aparecer. Se `contar` viesse depois de
     * `is-ativa`, o 2.254 escrito no HTML apareceria e cairia para zero
     * durante os 420ms de fade — que é exatamente o defeito medido na
     * referência, só que mais curto.
     *
     * Cena pulada pela barra mostra o número direto: quem saltou quer chegar,
     * não assistir a contagem de novo. */
    contar(c, !reduz && !saltado);
    c.classList.add('is-ativa', 'is-vis');

    segs.forEach(function (f, k) { f.style.width = k < i ? '100%' : '0%'; });
    if (anuncio) anuncio.textContent = 'Cena ' + (i + 1) + ' de ' + cenas.length + ': ' + (c.dataset.nome || '');

    decorrido = 0;
    t0 = performance.now();
    if (i === cenas.length - 1) { fim(); return; }
    if (!pausado) tocar();
  }

  function fim() {
    pausar(true);
    if (rever) rever.hidden = false;
    if (botao) botao.hidden = true;
    segs[segs.length - 1].style.width = '100%';
  }

  /* Duas engrenagens separadas, de propósito.
   *
   * O AVANÇO é agendamento: `setTimeout`. A BARRA é pintura:
   * `requestAnimationFrame`. Escrevi tudo em rAF primeiro, e o teste pegou o
   * acoplamento — num contexto sem compositor a peça simplesmente parava na
   * cena 1, porque o único relógio que mandava avançar era o de desenhar. Aba
   * em segundo plano, GPU ocupada e economia de bateria produzem o mesmo
   * efeito num telefone de verdade: a história trava e a barra congela junto,
   * sem que ninguém saiba por quê.
   *
   * Separadas, o pior caso é a barra andar aos trancos enquanto a história
   * continua no tempo certo. */
  function pintar(t) {
    quadro = null;
    if (pausado) return;
    var d = duracao(atual);
    if (d) segs[atual].style.width = Math.min((decorrido + (t - t0)) / d, 1) * 100 + '%';
    quadro = requestAnimationFrame(pintar);
  }

  function tocar() {
    if (atual === cenas.length - 1) return;
    var d = duracao(atual);
    if (!d) return;
    pausado = false;
    t0 = performance.now();
    clearTimeout(relogio);
    relogio = setTimeout(function () { irPara(atual + 1); }, Math.max(d - decorrido, 0));
    if (botao) { botao.textContent = 'Pausar'; botao.setAttribute('aria-pressed', 'false'); }
    if (!quadro) quadro = requestAnimationFrame(pintar);
  }

  function pausar(fimDaPeca) {
    if (!pausado) decorrido += performance.now() - t0;
    pausado = true;
    clearTimeout(relogio);
    relogio = null;
    if (quadro) { cancelAnimationFrame(quadro); quadro = null; }
    if (botao && !fimDaPeca) { botao.textContent = 'Continuar'; botao.setAttribute('aria-pressed', 'true'); }
  }

  function alternar() { if (pausado) tocar(); else pausar(); }

  /* --- controles --------------------------------------------------------- */

  if (botao) botao.addEventListener('click', alternar);
  if (rever) rever.addEventListener('click', function () {
    contadores.forEach(function (n) { delete n.dataset.feito; });
    rever.hidden = true;
    if (botao) botao.hidden = false;
    var i = atual; atual = -1; irPara(0); void i;
    if (!reduz) tocar();
  });

  /* Segurar pausa, soltar continua — convenção de stories, todo mundo conhece.
   * Só vale quando a peça está tocando: segurar não pode "despausar" quem
   * apertou Pausar de propósito. */
  var seguravaTocando = false;
  function segurou() { if (!pausado) { seguravaTocando = true; pausar(); } }
  function soltou() { if (seguravaTocando) { seguravaTocando = false; tocar(); } }
  ['pointerdown'].forEach(function (e) { document.addEventListener(e, segurou); });
  ['pointerup', 'pointercancel'].forEach(function (e) { document.addEventListener(e, soltou); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { pausar(); irPara(atual + 1, true); }
    else if (e.key === 'ArrowLeft') { pausar(); irPara(atual - 1, true); }
    else if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); alternar(); }
    else if (e.key === 'Escape') { location.href = 'index.html'; }
    else return;
  });

  /* Zonas de toque. Ficam ATRÁS de tudo que é clicável — a marca, os controles
   * e os botões do fecho têm z-index maior. Clique na estrela não pode virar
   * "próxima cena": é a única saída da peça. */
  function zona(classe, passo) {
    var z = document.createElement('button');
    z.type = 'button';
    z.className = 'zona ' + classe;
    z.tabIndex = -1;
    z.setAttribute('aria-hidden', 'true');
    z.addEventListener('click', function () { pausar(); irPara(atual + passo, true); });
    document.body.appendChild(z);
  }
  zona('zona--ant', -1);
  zona('zona--pro', 1);

  /* --- partida ----------------------------------------------------------- */

  if (reduz && nota) nota.hidden = false;

  /* A foto da capa antes da primeira transição: cena entrando sem imagem é
   * pior que meio segundo a mais de espera. */
  var foto = document.querySelector('.fundo img');
  function comecar() { irPara(0); if (!reduz) tocar(); }
  if (foto && !foto.complete) {
    var partiu = false;
    var vai = function () { if (!partiu) { partiu = true; comecar(); } };
    foto.addEventListener('load', vai);
    foto.addEventListener('error', vai);
    setTimeout(vai, 2500);
  } else {
    comecar();
  }
})();
