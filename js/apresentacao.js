/* apresentacao.js — o guia de aprovação: guardar, contar e montar o retorno.
 *
 * Nada é enviado. A página junta o que a pessoa respondeu e devolve um TEXTO
 * para ela copiar e mandar de volta pelo canal dela. É a mesma lógica que já
 * vale no assistente do site: o aparelho monta, a pessoa envia.
 *
 * O `localStorage` vive só aqui, e a página avisa na cara que existe, com
 * botão de apagar. A promessa pública de "zero cookie, zero rastreador" é do
 * site — index, gabinete e trajetória —, e a régua confere que ela não foi
 * quebrada. Este guia é peça à parte, com noindex, fora da navegação.
 *
 * Tudo em try/catch: navegador com armazenamento bloqueado (janela anônima,
 * site data desligado) continua funcionando, só perde o rascunho. Guia que
 * quebra porque não pôde salvar rascunho seria pior que guia sem rascunho.
 *
 * Riva's Alexandre · 01/09/2026
 */
(function () {
  'use strict';

  var CHAVE = 'wd-aprovacao-v1';
  var ROTULO = { aprovo: 'APROVADOS', ajuste: 'COM AJUSTE', nao: 'NÃO USAR' };

  function ler() {
    try { return JSON.parse(localStorage.getItem(CHAVE) || '{}'); }
    catch (e) { return {}; }
  }
  function gravar(o) {
    try { localStorage.setItem(CHAVE, JSON.stringify(o)); }
    catch (e) { /* rascunho é conveniência, não requisito */ }
  }

  var estado = ler();
  var cartoes = [].slice.call(document.querySelectorAll('[data-item]'));
  var pendencias = [].slice.call(document.querySelectorAll('[data-pend]'));
  var contador = document.getElementById('contador');
  var barra = document.getElementById('prog-f');

  function contar() {
    var n = cartoes.filter(function (c) { return estado[c.dataset.item] && estado[c.dataset.item].v; }).length;
    contador.textContent = n + ' de ' + cartoes.length + ' respondidos';
    barra.style.width = (n / cartoes.length * 100) + '%';
  }

  /* Decisões avulsas — hoje só a de Libras. Usam os mesmos três botões dos
   * cartões, mas ficam FORA da contagem: o contador mede quanto do site já foi
   * revisado, e uma escolha de escopo ali faria a barra mentir sobre o que
   * ainda falta ler. Mesmo tratamento do caminho de WhatsApp. */
  var extras = [].slice.call(document.querySelectorAll('[data-extra]'));

  /* --- os cartões e as decisões ------------------------------------------- */
  cartoes.concat(extras).forEach(function (cartao) {
    var id = cartao.dataset.item || ('extra-' + cartao.dataset.extra);
    var botoes = [].slice.call(cartao.querySelectorAll('.voto__b'));
    var caixa = cartao.querySelector('.voto__obs');
    var obs = cartao.querySelector('[data-obs]');

    function pintar() {
      var e = estado[id] || {};
      botoes.forEach(function (b) {
        var on = b.dataset.v === e.v;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      /* A observação só aparece quando há o que observar. Campo de texto
       * aberto em quinze cartões que a pessoa aprovou sem ressalva é ruído. */
      caixa.hidden = !(e.v === 'ajuste' || e.v === 'nao');
      if (obs && e.obs != null) obs.value = e.obs;
    }

    botoes.forEach(function (b) {
      b.addEventListener('click', function () {
        var e = estado[id] || {};
        /* clicar de novo no mesmo botão desmarca — quem errou o clique não
         * fica preso a uma resposta que não quis dar */
        e.v = (e.v === b.dataset.v) ? null : b.dataset.v;
        estado[id] = e;
        gravar(estado); pintar(); contar();
      });
    });

    if (obs) {
      obs.addEventListener('input', function () {
        estado[id] = estado[id] || {};
        estado[id].obs = obs.value;
        gravar(estado);
      });
    }
    pintar();
  });

  /* --- as pendências ------------------------------------------------------ */
  pendencias.forEach(function (p) {
    var id = 'pend-' + p.dataset.pend;
    var caixa = p.querySelector('input[type=checkbox]');
    var resp = p.querySelector('[data-resp]');
    var e = estado[id] || {};
    caixa.checked = !!e.ok;
    if (e.r != null) resp.value = e.r;
    function salvar() {
      estado[id] = { ok: caixa.checked, r: resp.value };
      gravar(estado);
    }
    caixa.addEventListener('change', salvar);
    resp.addEventListener('input', salvar);
  });

  /* --- o caminho do canal de WhatsApp -------------------------------------
   *
   * É a única escolha do guia que muda dinheiro. Fica fora da contagem dos
   * cartões de propósito: o contador mede quanto do SITE foi revisado, e
   * misturar uma decisão de contrato ali faria a barra mentir sobre o que
   * ainda falta ler. */
  var caminhos = [].slice.call(document.querySelectorAll('[data-caminho]'));
  function pintarCaminho() {
    caminhos.forEach(function (c) {
      var on = String(estado.caminho) === c.dataset.caminho;
      c.classList.toggle('is-on', on);
      c.querySelector('.cam__e').textContent = on ? 'Escolhido ✓' : 'Escolher este';
      c.querySelector('.cam__e').setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  caminhos.forEach(function (c) {
    c.querySelector('.cam__e').addEventListener('click', function () {
      estado.caminho = (String(estado.caminho) === c.dataset.caminho) ? null : c.dataset.caminho;
      gravar(estado); pintarCaminho();
    });
  });
  pintarCaminho();

  contar();

  /* --- montar o retorno --------------------------------------------------- */
  function titulo(cartao) {
    return cartao.dataset.titulo || cartao.querySelector('h2').textContent.trim();
  }

  function montar() {
    var hoje = new Date();
    var data = String(hoje.getDate()).padStart(2, '0') + '/'
      + String(hoje.getMonth() + 1).padStart(2, '0') + '/' + hoje.getFullYear();

    var grupos = { aprovo: [], ajuste: [], nao: [], sem: [] };
    cartoes.forEach(function (c) {
      var e = estado[c.dataset.item] || {};
      var linha = '· ' + titulo(c);
      if (e.obs && e.obs.trim()) linha += ' — "' + e.obs.trim() + '"';
      grupos[e.v || 'sem'].push(linha);
    });

    var L = ['APROVAÇÃO — SITE WELLINGTON DANTAS', data, ''];
    ['aprovo', 'ajuste', 'nao'].forEach(function (k) {
      if (!grupos[k].length) return;
      L.push(ROTULO[k] + ' (' + grupos[k].length + ')');
      L = L.concat(grupos[k], '');
    });
    /* O que ficou sem resposta é dito, não omitido: quem recebe precisa saber
     * que faltou, em vez de supor aprovação por silêncio. */
    if (grupos.sem.length) {
      L.push('AINDA SEM RESPOSTA (' + grupos.sem.length + ')');
      L = L.concat(grupos.sem, '');
    }

    var resp = [];
    pendencias.forEach(function (p) {
      var e = estado['pend-' + p.dataset.pend] || {};
      var nome = p.querySelector('b').textContent.trim();
      if (e.ok || (e.r && e.r.trim())) {
        resp.push('· ' + nome + ': ' + ((e.r && e.r.trim()) || 'resolvido') + (e.ok ? ' [ok]' : ''));
      }
    });
    if (resp.length) { L.push('PENDÊNCIAS RESPONDIDAS'); L = L.concat(resp, ''); }

    var dec = [];
    extras.forEach(function (x) {
      var e = estado['extra-' + x.dataset.extra] || {};
      if (!e.v) return;
      var como = { aprovo: 'sim', ajuste: 'sim, mas depois', nao: 'não usar' }[e.v];
      dec.push('· ' + titulo(x) + ': ' + como + (e.obs && e.obs.trim() ? ' — "' + e.obs.trim() + '"' : ''));
    });
    if (dec.length) { L.push('DECISÕES'); L = L.concat(dec, ''); }

    if (estado.caminho != null && caminhos[estado.caminho]) {
      L.push('CANAL DE WHATSAPP — CAMINHO ESCOLHIDO');
      L.push('· ' + caminhos[estado.caminho].querySelector('h4').textContent.trim()
        + ' — ' + caminhos[estado.caminho].querySelector('.cam__v').textContent.trim());
      L.push('');
    }

    L.push('— retorno montado no guia de aprovação, sem envio automático.');
    return L.join('\n');
  }

  var botaoMontar = document.getElementById('montar');
  var saida = document.getElementById('saida');
  var texto = document.getElementById('texto');
  var zap = document.getElementById('zap');

  botaoMontar.addEventListener('click', function () {
    texto.value = montar();
    saida.hidden = false;
    /* wa.me sem número abre a lista de conversas e a pessoa escolhe — o número
     * do gabinete ainda não está definido, e inventar um seria pior. */
    zap.href = 'https://wa.me/?text=' + encodeURIComponent(texto.value);
    saida.scrollIntoView({ block: 'start' });
    texto.focus();
  });

  /* Confirmação visível, e plano B de verdade.
   *
   * Botão de copiar que não muda de rótulo deixa a pessoa sem saber se copiou
   * — ela descobre colando o vazio. E quando a área de transferência falha,
   * não basta avisar: o texto tem que ficar selecionado, pronto para o
   * Ctrl+C. */
  var copiar = document.getElementById('copiar');
  var nota = document.getElementById('copia-nota');
  var volta = null;

  function confirmar(msg, deuErrado) {
    copiar.textContent = msg;
    nota.hidden = !deuErrado;
    clearTimeout(volta);
    volta = setTimeout(function () { copiar.textContent = 'Copiar o texto'; }, 2000);
  }

  function planoB() {
    texto.removeAttribute('readonly');
    texto.focus();
    texto.select();
    texto.setAttribute('readonly', '');
    confirmar('Copie na mão', true);
  }

  copiar.addEventListener('click', function () {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto.value).then(
        function () { confirmar('Copiado ✓', false); },
        planoB
      );
    } else {
      planoB();
    }
  });

  document.getElementById('recomecar').addEventListener('click', function () {
    if (!confirm('Apagar todas as suas respostas deste guia? Não dá para desfazer.')) return;
    try { localStorage.removeItem(CHAVE); } catch (e) { /* já não havia */ }
    location.reload();
  });
})();
