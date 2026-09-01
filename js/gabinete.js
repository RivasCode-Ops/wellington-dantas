/* Gabinete Aberto — comportamento.
 *
 * O protótipo entregue simulava o envio: gerava um protocolo aleatório e
 * mostrava recibo, sem mandar nada a lugar nenhum. Num formulário onde alguém
 * marca "fio solto na rua", isso é pior que não ter formulário — a pessoa sai
 * achando que o gabinete foi avisado.
 *
 * Enquanto não há backend, o que este arquivo faz é o que ele diz que faz:
 * monta o texto no aparelho, dá um código para a pessoa cobrar, e entrega o
 * envio a ela. Nenhum dado sai daqui.
 *
 * Riva's Alexandre · 01/09/2026
 */
(function () {
  'use strict';

  /* --- abas --------------------------------------------------------------- */
  var abas = document.querySelectorAll('.aba');
  function abrir(nome) {
    abas.forEach(function (a) {
      var on = a.dataset.v === nome;
      a.classList.toggle('is-on', on);
      a.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.v').forEach(function (v) {
      v.classList.toggle('is-on', v.id === 'v-' + nome);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  abas.forEach(function (a) { a.addEventListener('click', function () { abrir(a.dataset.v); }); });
  document.addEventListener('click', function (e) {
    var l = e.target.closest && e.target.closest('[data-aba]');
    if (!l) return;
    e.preventDefault();
    abrir(l.dataset.aba);
  });
  if (location.hash === '#minha-rua') abrir('pedir');

  /* --- mural: filtro por situação e busca --------------------------------- */
  var cards = document.getElementById('cards');
  if (cards) {
    var itens = Array.prototype.slice.call(cards.querySelectorAll('li'));
    var vazio = document.getElementById('semcard');
    var fs = '';
    var fb = '';

    var anuncio = document.getElementById('mural-anuncio');
    var vazioMural = document.getElementById('mural-vazio');

    /* O texto do vazio muda conforme o MOTIVO de estar vazio.
     *
     * "Nenhum resultado" serve para busca sem acerto. N\u00e3o serve para o filtro
     * de Negado / Arquivado, que est\u00e1 vazio porque nada foi negado at\u00e9 aqui \u2014
     * e isso \u00e9 informa\u00e7\u00e3o, n\u00e3o falha. Um mural que estreia com um indeferimento
     * fabricado seria pior que um mural sem o filtro. */
    function textoVazio(q) {
      if (fs === 'Negado' && !q) {
        return 'Nenhum pedido foi negado ou arquivado at\u00e9 aqui. Quando acontecer, ele aparece nesta lista com o motivo \u2014 \u00e9 o que separa mural de vitrine.';
      }
      if (q) return 'Nada no mural bate com \u201c' + q + '\u201d. Tente o nome do bairro, da rua ou do assunto \u2014 ou mande a demanda pela aba Minha rua.';
      return 'Nenhum registro nesta situa\u00e7\u00e3o por enquanto.';
    }

    function pinta() {
      var bruto = fb.trim();
      var q = bruto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      var vistos = 0;
      itens.forEach(function (li) {
        var bateS = !fs || li.dataset.sit === fs;
        var bateQ = !q || li.dataset.busca.indexOf(q) !== -1;
        li.hidden = !(bateS && bateQ);
        if (!li.hidden) vistos++;
      });
      if (vazio) vazio.hidden = vistos > 0;
      if (vazioMural) {
        vazioMural.textContent = textoVazio(bruto);
        vazioMural.hidden = vistos > 0;
      }
      /* Quem filtra sem enxergar precisa ouvir quantos sobraram. Sem isto,
       * trocar de filtro no leitor de tela n\u00e3o produz retorno nenhum. */
      if (anuncio) {
        anuncio.textContent = vistos === 0 ? textoVazio(bruto)
          : vistos + (vistos === 1 ? ' registro encontrado.' : ' registros encontrados.');
      }
    }

    var chips = document.getElementById('fstatus');
    if (chips) {
      chips.addEventListener('click', function (e) {
        var c = e.target.closest('.chip');
        if (!c) return;
        chips.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('is-on'); });
        c.classList.add('is-on');
        fs = c.dataset.f || '';
        pinta();
      });
    }
    var busca = document.getElementById('fbusca');
    if (busca) busca.addEventListener('input', function () { fb = busca.value; pinta(); });
  }

  /* --- contadores do mural ------------------------------------------------ */
  var reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-c]').forEach(function (n) {
    var alvo = Number(n.dataset.c);
    if (reduz || !alvo) { n.textContent = alvo || 0; return; }
    var ini = null;
    requestAnimationFrame(function passo(t) {
      if (!ini) ini = t;
      var k = Math.min((t - ini) / 700, 1);
      n.textContent = Math.round(alvo * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(passo);
    });
  });

  /* --- formulário --------------------------------------------------------- */
  var form = document.getElementById('form');
  if (!form) return;
  var recibo = document.getElementById('recibo');

  /* Código da mensagem, não protocolo de fila. Fila exige banco e responsável;
   * prometer número de acompanhamento que ninguém consulta é pior que não ter.
   * A legenda na tela diz o que ele é. */
  function codigo() {
    var d = new Date();
    var iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    var letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var s = '';
    for (var i = 0; i < 4; i++) s += letras.charAt(Math.floor(Math.random() * letras.length));
    return 'PIC-' + iso + '-' + s;
  }

  var msg = '';

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;

    var v = function (id) { return document.getElementById(id).value.trim(); };
    var risco = document.getElementById('g-risco').checked;
    var cod = codigo();

    msg = 'Demanda ' + cod + '\n'
      + (risco ? '*** RISCO DE ACIDENTE ***\n' : '')
      + 'Bairro: ' + v('g-bairro') + '\n'
      + 'Local: ' + v('g-rua') + '\n'
      + 'Assunto: ' + v('g-cat') + '\n'
      + 'Descrição: ' + v('g-desc') + '\n'
      + 'De: ' + v('g-nome') + ' — WhatsApp ' + v('g-zap') + '\n'
      + 'Canal: Gabinete Aberto, site do mandato';

    document.getElementById('codigo').textContent = cod;
    document.getElementById('mensagem').textContent = msg;
    form.hidden = true;
    recibo.hidden = false;
    recibo.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  document.getElementById('copiar').addEventListener('click', function () {
    var b = this;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(msg).then(
        function () { b.textContent = 'Copiado'; },
        function () { b.textContent = 'Selecione o texto acima'; }
      );
    } else {
      b.textContent = 'Selecione o texto acima';
    }
  });

  document.getElementById('novo').addEventListener('click', function () {
    form.reset();
    form.hidden = false;
    recibo.hidden = true;
    document.getElementById('copiar').textContent = 'Copiar o texto';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();

/* --- ampliar a mídia do card -------------------------------------------
 *
 * <dialog> nativo, sem biblioteca. Esc fecha sozinho, o foco fica preso
 * dentro e volta para onde estava — tudo isso o navegador já faz, e é o
 * argumento para não trazer 30 KB de lightbox.
 *
 * O diálogo é criado na primeira vez que alguém clica, e não no carregamento:
 * hoje nenhum card tem mídia, então a página não paga por ele. */
(function () {
  'use strict';
  var cards = document.getElementById('cards');
  if (!cards) return;
  var dlg = null;

  cards.addEventListener('click', function (e) {
    var fig = e.target.closest('.card__f');
    if (!fig) return;
    var midia = fig.querySelector('img, video');
    if (!midia) return;
    /* No vídeo o clique é do play, não do ampliar: os controles são dele. */
    if (midia.tagName === 'VIDEO') return;
    e.preventDefault();

    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'lupa';
      dlg.innerHTML = '<img alt=""><p class="lupa__l"></p>'
        + '<button class="lupa__x" type="button" aria-label="Fechar">Fechar</button>';
      dlg.querySelector('.lupa__x').addEventListener('click', function () { dlg.close(); });
      /* clique no fundo fecha — o <dialog> não faz isso sozinho */
      dlg.addEventListener('click', function (ev) { if (ev.target === dlg) dlg.close(); });
      document.body.appendChild(dlg);
    }
    var img = dlg.querySelector('img');
    img.src = midia.currentSrc || midia.src;
    img.alt = midia.alt || '';
    var leg = fig.querySelector('figcaption');
    dlg.querySelector('.lupa__l').textContent = leg ? leg.textContent : '';
    dlg.showModal();
  });
})();
