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

    function pinta() {
      var q = fb.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      var vistos = 0;
      itens.forEach(function (li) {
        var bateS = !fs || li.dataset.sit === fs;
        var bateQ = !q || li.dataset.busca.indexOf(q) !== -1;
        li.hidden = !(bateS && bateQ);
        if (!li.hidden) vistos++;
      });
      if (vazio) vazio.hidden = vistos > 0;
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
