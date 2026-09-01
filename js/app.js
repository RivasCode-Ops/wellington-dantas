/* Wellington Dantas — comportamento da página.
 *
 * Uma coisa só: filtrar a lista de ações que JÁ está no HTML, por busca livre
 * ou por bairro. Nada é buscado na rede, nada é montado na hora. Com o
 * JavaScript desligado a página continua completa — só perde o filtro.
 *
 * Zero dependência, zero framework.
 *
 * Riva's Alexandre · 01/09/2026
 */
(function () {
  'use strict';

  var lista = document.getElementById('lista');
  if (!lista) return;

  var itens = Array.prototype.slice.call(lista.querySelectorAll('li'));
  var campo = document.getElementById('busca');
  var vazio = document.getElementById('vazio');
  var faixa = document.getElementById('filtro');
  var faixaNome = document.getElementById('filtro-nome');
  var limpar = document.getElementById('filtro-limpar');

  function chave(texto) {
    return String(texto)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function mostrar(quantos, rotulo) {
    if (vazio) vazio.hidden = quantos > 0;
    if (!faixa) return;
    if (rotulo) {
      faixaNome.textContent = rotulo + ' · ' + quantos + (quantos === 1 ? ' ação' : ' ações');
      faixa.hidden = false;
    } else {
      faixa.hidden = true;
    }
  }

  /* busca livre: casa o termo contra o texto normalizado de cada linha */
  function buscar(termo) {
    var alvo = chave(termo);
    var vistos = 0;
    itens.forEach(function (li) {
      var bate = !alvo || li.getAttribute('data-busca').indexOf(alvo) !== -1;
      li.classList.toggle('is-off', !bate);
      if (bate) vistos++;
    });
    mostrar(vistos, alvo ? '“' + termo.trim() + '”' : '');
  }

  /* filtro por bairro: casa a chave do bairro contra data-bairros */
  function porBairro(chaveBairro, nome) {
    var vistos = 0;
    itens.forEach(function (li) {
      var bairros = (' ' + li.getAttribute('data-bairros') + ' ');
      var bate = bairros.indexOf(' ' + chaveBairro + ' ') !== -1;
      li.classList.toggle('is-off', !bate);
      if (bate) vistos++;
    });
    if (campo) campo.value = '';
    mostrar(vistos, nome);
  }

  function tudo() {
    itens.forEach(function (li) { li.classList.remove('is-off'); });
    if (campo) campo.value = '';
    mostrar(itens.length, '');
  }

  if (campo) {
    campo.addEventListener('input', function () { buscar(campo.value); });
    var form = campo.closest('form');
    if (form) form.addEventListener('submit', function (e) { e.preventDefault(); buscar(campo.value); });
  }

  if (limpar) limpar.addEventListener('click', tudo);

  document.addEventListener('click', function (e) {
    var alvo = e.target.closest ? e.target.closest('[data-filtro]') : null;
    if (!alvo) return;
    var nome = alvo.getAttribute('data-nome') || alvo.textContent.replace(/\s*\d+\s*$/, '').trim();
    porBairro(alvo.getAttribute('data-filtro'), nome);
    /* o href="#entregas" leva a página até a lista sozinho */
  });

  /* ====================================================================
     Mapa interativo
     ====================================================================
     O SVG está inline no HTML e os dados vêm de um <script type="json">
     escrito pelo gerador. Sem JavaScript, o mapa continua sendo um desenho
     correto — quem pinta os bairros é o CSS sobre a classe que o gerador
     escreveu, e a lista de bairros logo abaixo faz o mesmo trabalho.
     ==================================================================== */
  (function () {
    var svg = document.getElementById('mapa');
    var caixa = document.getElementById('painel-conteudo');
    var inicio = document.getElementById('painel-inicio');
    var fonte = document.getElementById('mapa-dados');
    if (!svg || !caixa || !inicio || !fonte) return;

    var DADOS;
    try { DADOS = JSON.parse(fonte.textContent); } catch (e) { return; }

    var fixado = null;

    function esc(s) {
      return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    var CONCLUIDA = /conclu|realizada|entregue/i;

    function pintar(k) {
      var d = DADOS[k];
      if (!d) return;
      var n = d.itens.length;
      var html = '<div class="painel__cab">'
        + '<p class="olho">' + (n ? 'Ações registradas' : 'Sem registro ainda') + '</p>'
        + '<h3>' + esc(d.nome) + '</h3>'
        + '<p class="painel__cnt">' + (n
          ? n + (n === 1 ? ' ação registrada' : ' ações registradas')
          : 'Nenhuma ação registrada neste levantamento') + '</p></div>';

      if (n) {
        html += '<ol class="painel__itens">' + d.itens.map(function (o) {
          return '<li><div class="painel__t">'
            + '<span class="painel__ano">' + esc(o.ano) + '</span>'
            + '<span class="tag">' + esc(o.cat) + '</span>'
            + '<span class="painel__sit' + (CONCLUIDA.test(o.sit) ? ' ok' : '') + '">' + esc(o.sit) + '</span>'
            + '</div><h4>' + esc(o.titulo) + '</h4>'
            + '<p>' + esc(o.local) + ' · ' + esc(o.inst) + '</p>'
            + '<cite>Fonte: ' + esc(o.fonte) + '</cite></li>';
        }).join('') + '</ol>'
          + '<a class="btn" href="#entregas" data-filtro="' + esc(d.filtro) + '" data-nome="' + esc(d.nome) + '">Ver na lista de entregas</a>';
      } else {
        /* Bairro vazio não é buraco: é o pedido de contato que ainda não veio.
           Sem este bloco, o morador de 26 dos 30 bairros clica, não acha nada
           e vai embora. */
        html += '<p class="painel__nada">Ainda não há obra ou pedido registrado para este bairro neste levantamento. '
          + 'Se a sua rua precisa de alguma coisa, o gabinete recebe, protocola e devolve o andamento.</p>'
          + '<a class="btn" href="#participe">Enviar uma demanda deste bairro</a>';
      }
      caixa.innerHTML = html;
      caixa.hidden = false;
      inicio.hidden = true;
    }

    function limpar() {
      if (fixado) return;
      caixa.hidden = true;
      inicio.hidden = false;
    }

    function marcar(k) {
      var antes = svg.querySelectorAll('.is-sel');
      for (var i = 0; i < antes.length; i++) antes[i].classList.remove('is-sel');
      if (!k) return;
      var el = svg.querySelector('[data-k="' + k + '"]');
      if (el) el.classList.add('is-sel');
    }

    function alternar(p) {
      var k = p.getAttribute('data-k');
      if (fixado === k) { fixado = null; marcar(null); limpar(); return; }
      fixado = k; marcar(k); pintar(k);
    }

    function alvoDe(e) {
      return e.target.closest ? e.target.closest('path[data-k]') : null;
    }

    svg.addEventListener('mouseover', function (e) {
      var p = alvoDe(e);
      if (!p || fixado || !DADOS[p.getAttribute('data-k')]) return;
      marcar(p.getAttribute('data-k'));
      pintar(p.getAttribute('data-k'));
    });
    svg.addEventListener('mouseleave', function () { if (!fixado) { marcar(null); limpar(); } });
    svg.addEventListener('focusin', function (e) {
      var p = alvoDe(e);
      if (!p || !DADOS[p.getAttribute('data-k')]) return;
      marcar(p.getAttribute('data-k'));
      pintar(p.getAttribute('data-k'));
    });
    svg.addEventListener('click', function (e) {
      var p = alvoDe(e);
      if (p && DADOS[p.getAttribute('data-k')]) alternar(p);
    });
    svg.addEventListener('keydown', function (e) {
      var p = alvoDe(e);
      if (p && DADOS[p.getAttribute('data-k')] && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        alternar(p);
      }
      if (e.key === 'Escape') { fixado = null; marcar(null); limpar(); }
    });
    document.addEventListener('click', function (e) {
      if (fixado && !(e.target.closest && e.target.closest('#painel, #mapa'))) {
        fixado = null; marcar(null); limpar();
      }
    });
  })();
})();
