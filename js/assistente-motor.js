/* Dantas.IA — motor de recuperação.
 *
 * Não gera texto. Recupera. Toda frase que o assistente diz está escrita em
 * dados/assistente-base.json — o motor só decide qual registro responde.
 *
 * A regra do mapa vale aqui: bairro pintado sem ação no banco é mentira no
 * mapa; resposta sem fonte no arquivo é mentira no chat. Registro factual sem
 * `fonte.rotulo` não carrega, e o console diz qual foi descartado.
 *
 * Função pura, sem DOM: dá para testar sem navegador.
 *
 * Riva's Alexandre · 01/09/2026
 */
(function (raiz) {
  'use strict';

  var STOP = ['de', 'da', 'do', 'das', 'dos', 'o', 'a', 'os', 'as', 'e', 'em', 'no', 'na',
    'um', 'uma', 'que', 'qual', 'quais', 'me', 'pra', 'para', 'por', 'com', 'sobre',
    'ele', 'dele', 'sao', 'ao', 'aos', 'se', 'foi', 'ser', 'esta', 'tem'];

  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokens(s) {
    var fora = {};
    for (var i = 0; i < STOP.length; i++) fora[STOP[i]] = true;
    return norm(s).split(' ').filter(function (t) { return t && !fora[t]; });
  }

  /* Cobertura do gatilho: quanto do gatilho aparece na pergunta.
   *
   * A spec pedia Dice — 2·acertos / (tokens do gatilho + tokens da pergunta).
   * Medi contra os próprios critérios de aceite dela e Dice reprova em dois:
   *
   *   "quero reclamar de um buraco na minha rua"  → 0,333, abaixo do limiar,
   *      caía em fallback. O denominador cresce com a pergunta, então quanto
   *      mais alguém explica o problema, menos o motor entende. É o avesso do
   *      que se quer num canal de demanda.
   *   "Você é o Wellington?"  → o segundo colocado passava do limiar e a
   *      resposta saía marcada como pergunta composta, quando não é.
   *
   * Cobertura não depende do tamanho da pergunta: mede se o gatilho está lá.
   * O desempate é por número de tokens casados — gatilho de duas palavras
   * inteiras ganha de gatilho de uma. */
  function score(perguntaTokens, registro) {
    var melhor = 0;
    var melhorAcertos = 0;
    for (var i = 0; i < registro.gatilhos.length; i++) {
      var g = tokens(registro.gatilhos[i]);
      if (!g.length) continue;
      var acertos = 0;
      for (var j = 0; j < g.length; j++) {
        if (perguntaTokens.indexOf(g[j]) !== -1) acertos++;
      }
      var s = acertos / g.length;
      if (s > melhor || (s === melhor && acertos > melhorAcertos)) {
        melhor = s;
        melhorAcertos = acertos;
      }
    }
    return { s: melhor, acertos: melhorAcertos };
  }

  /* Descarta registro factual sem fonte. Registro de sistema (identidade,
   * fallback, formulário) não afirma fato sobre o mundo e por isso não precisa
   * de fonte — mas precisa estar marcado como tal, de propósito. */
  function validar(base) {
    var bons = [];
    var descartados = [];
    for (var i = 0; i < base.registros.length; i++) {
      var r = base.registros[i];
      var precisaFonte = !r.sistema && !r.pendente;
      var temFonte = r.fonte && r.fonte.rotulo && String(r.fonte.rotulo).trim() !== '';
      if (precisaFonte && !temFonte) { descartados.push(r.id); continue; }
      bons.push(r);
    }
    if (descartados.length && raiz.console) {
      console.warn('Dantas.IA: registro sem fonte, descartado — ' + descartados.join(', '));
    }
    base.registros = bons;
    return base;
  }

  /* Recusa antes de qualquer casamento por palavra-chave.
   *
   * Sem isto, "Em quem devo votar?" casava com o gatilho "quem e" do registro
   * de biografia e o assistente respondia com o número de votos dele — o que,
   * num site de mandato de quem não é candidato, é orientação de voto emitida
   * por acidente. A recusa vem primeiro porque o motor não pode ter chance de
   * acertar aqui: tem que não tentar.
   *
   * Os termos são frases de intenção, não palavras soltas: "quantos votos ele
   * teve" continua sendo uma pergunta legítima sobre o passado e é respondida. */
  function bloqueado(pergunta, base) {
    if (!base.bloqueios) return null;
    var n = ' ' + norm(pergunta) + ' ';
    for (var i = 0; i < base.bloqueios.length; i++) {
      var b = base.bloqueios[i];
      for (var j = 0; j < b.termos.length; j++) {
        if (n.indexOf(' ' + norm(b.termos[j])) !== -1) {
          return { tipo: 'recusa', resposta: b.resposta, termo: b.termos[j] };
        }
      }
    }
    return null;
  }

  /* Pergunta que nomeia um bairro é respondida por aquele bairro. O dado já
   * está no site — não usá-lo era devolver a média quando perguntaram o caso. */
  function porBairro(pergunta, base) {
    if (!base.bairros) return null;
    var n = ' ' + norm(pergunta) + ' ';
    var achado = null;
    for (var chave in base.bairros) {
      if (!Object.prototype.hasOwnProperty.call(base.bairros, chave)) continue;
      var b = base.bairros[chave];
      var alvo = ' ' + norm(b.nome) + ' ';
      if (n.indexOf(alvo) === -1) continue;
      /* nome mais longo ganha: "Alto da Boa Vista" antes de "Boa Vista" */
      if (!achado || b.nome.length > achado.nome.length) achado = b;
    }
    return achado ? { tipo: 'bairro', bairro: achado } : null;
  }

  /* Devolve SEMPRE um objeto. Nunca null, nunca undefined. */
  function responder(pergunta, base) {
    var recusa = bloqueado(pergunta, base);
    if (recusa) return recusa;

    var pt = tokens(pergunta);
    if (!pt.length) return { tipo: 'fallback', motivo: 'vazio' };

    /* Bairro nomeado ganha do casamento genérico — mas a outra metade da
     * pergunta não é engolida: se algum registro também casa forte, ele vem
     * junto como aviso, igual à pergunta composta. */
    var doBairro = porBairro(pergunta, base);
    if (doBairro) {
      var outro = base.registros
        .filter(function (r) { return !r.pendente && r.id !== 'atuacao-bairros'; })
        .map(function (r) { var m = score(pt, r); return { r: r, s: m.s }; })
        .sort(function (a, b) { return b.s - a.s; })[0];
      doBairro.tambem = (outro && outro.s >= base.limiar) ? outro.r : null;
      return doBairro;
    }

    var ranking = base.registros
      .filter(function (r) { return !r.pendente; })
      .map(function (r) { var m = score(pt, r); return { r: r, s: m.s, acertos: m.acertos }; })
      .sort(function (a, b) { return (b.s - a.s) || (b.acertos - a.acertos); });

    var top = ranking[0];
    if (!top || top.s < base.limiar) return { tipo: 'fallback', motivo: 'abaixo do limiar' };

    /* Pergunta composta: o segundo colocado conta como "outro assunto
     * perguntado junto" quando chega perto do primeiro.
     *
     * A condição `acertos >= top.acertos`, que eu tinha posto para não marcar
     * "Você é o Wellington?" como composta, engolia metade de perguntas que
     * eram compostas de verdade: "Quantos votos ele teve e o que ele fez no
     * Pedrinhas?" casava 2 tokens no primeiro e 1 no segundo, e o segundo era
     * descartado em silêncio. Ela saiu — o limiar de 0,6 na cobertura já
     * separa os dois casos sozinho. */
    var segundo = ranking[1];
    var multi = segundo
      && segundo.r.id !== top.r.id
      && segundo.s >= base.limiar
      && segundo.s >= top.s * 0.9;

    return {
      tipo: 'resposta',
      registro: top.r,
      score: top.s,
      tambem: multi ? segundo.r : null
    };
  }

  raiz.DantasIA = { norm: norm, tokens: tokens, score: score, responder: responder, validar: validar };

  if (typeof module !== 'undefined' && module.exports) module.exports = raiz.DantasIA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
