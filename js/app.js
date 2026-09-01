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
    var nome = alvo.textContent.replace(/\s*\d+\s*$/, '').trim();
    porBairro(alvo.getAttribute('data-filtro'), nome);
    /* o href="#entregas" leva a página até a lista sozinho */
  });
})();
