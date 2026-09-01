/* Dantas.IA — lançador. Roda na página, não no chat.
 *
 * Este arquivo é de propósito o menor possível: até o primeiro clique, o
 * assistente não custa nem uma requisição a mais. O iframe, o CSS do chat, o
 * motor e a base só entram quando alguém decide falar.
 *
 * O iframe isola CSS e teclado do resto da página — que já tem SVG inline,
 * mapa interativo e filtros. Colisão de estilo aqui seria o defeito provável.
 *
 * Riva's Alexandre · 01/09/2026
 */
(function () {
  'use strict';

  var frame = null;
  var caixa = null;
  var aberto = false;

  var botao = document.createElement('button');
  botao.type = 'button';
  botao.id = 'assistente-launcher';
  botao.className = 'ia-fab';
  botao.setAttribute('aria-expanded', 'false');
  botao.setAttribute('aria-controls', 'assistente-frame');
  botao.setAttribute('aria-label', 'Abrir o assistente do mandato');
  botao.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"'
    + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.9-.9L3 21l1.9-4.6A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z"/>'
    + '</svg><span class="ia-fab__t">Assistente</span>';

  function criarIframe() {
    caixa = document.createElement('div');
    caixa.className = 'ia-caixa';

    frame = document.createElement('iframe');
    frame.id = 'assistente-frame';
    frame.title = 'Assistente do mandato';
    frame.src = 'assistente.html';
    /* `allow-forms` não é enfeite: sem ele o navegador bloqueia a submissão do
       formulário dentro do iframe e o evento `submit` nunca chega ao listener.
       O assistente ficava mudo para quem digitava e apertava Enter — só os
       chips funcionavam. E o defeito não aparecia em teste, porque
       `dispatchEvent(new Event("submit"))` não passa pelo bloqueio: só
       `requestSubmit()` e o Enter de verdade passam. */
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms');
    frame.setAttribute('referrerpolicy', 'no-referrer');

    caixa.appendChild(frame);
    document.body.appendChild(caixa);

    frame.addEventListener('load', function () {
      frame.contentWindow.postMessage({ tipo: 'foco' }, location.origin);
    });
  }

  /* O resto da página sai da navegação por teclado enquanto o chat está
   * aberto. `inert` faz o trabalho todo onde existe; onde não existe, o
   * aria-hidden ao menos tira do leitor de tela. */
  function inertFundo(ligar) {
    var filhos = document.body.children;
    for (var i = 0; i < filhos.length; i++) {
      var el = filhos[i];
      if (el === caixa || el === botao) continue;
      if (ligar) {
        el.setAttribute('inert', '');
        el.setAttribute('aria-hidden', 'true');
      } else {
        el.removeAttribute('inert');
        el.removeAttribute('aria-hidden');
      }
    }
  }

  function abrir() {
    if (!frame) criarIframe();
    document.body.classList.add('ia-aberto');
    caixa.classList.add('is-on');
    botao.setAttribute('aria-expanded', 'true');
    botao.setAttribute('aria-label', 'Fechar o assistente do mandato');
    inertFundo(true);
    aberto = true;
    if (frame.contentWindow) frame.contentWindow.postMessage({ tipo: 'foco' }, location.origin);
  }

  function fechar() {
    if (!aberto) return;
    document.body.classList.remove('ia-aberto');
    caixa.classList.remove('is-on');
    botao.setAttribute('aria-expanded', 'false');
    botao.setAttribute('aria-label', 'Abrir o assistente do mandato');
    inertFundo(false);
    aberto = false;
    botao.focus();   /* o foco volta para onde saiu */
  }

  botao.addEventListener('click', function () { aberto ? fechar() : abrir(); });

  /* ESC de fora do iframe */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && aberto) { e.preventDefault(); fechar(); }
  });

  /* ESC de dentro do iframe, e as ações que só a página pode executar */
  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin) return;
    var d = e.data || {};
    if (d.tipo === 'fechar') fechar();
    if (d.tipo === 'ir' && typeof d.alvo === 'string' && d.alvo.charAt(0) === '#') {
      fechar();
      /* leva o filtro junto: o chat manda para a lista JÁ filtrada pelo bairro
         que a pessoa perguntou, em vez de despejá-la nas 27 */
      if (d.filtro) {
        var gatilho = document.querySelector('[data-filtro="' + d.filtro + '"]');
        if (gatilho) { gatilho.click(); }
      }
      var alvo = document.querySelector(d.alvo);
      if (alvo) alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (d.tipo === 'abrir' && typeof d.url === 'string' && /^(https:\/\/|mailto:)/.test(d.url)) {
      window.open(d.url, '_blank', 'noopener');
    }
  });

  document.body.appendChild(botao);
})();
