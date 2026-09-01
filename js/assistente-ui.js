/* Dantas.IA — interface. Roda dentro do iframe.
 *
 * Toda mensagem é escrita com textContent. Nada de innerHTML com texto vindo
 * do JSON: a base é editável por gente do gabinete, e um dia alguém vai colar
 * um "<" ali dentro.
 *
 * Riva's Alexandre · 01/09/2026
 */
(function () {
  'use strict';

  var log = document.getElementById('log');
  var digitando = document.getElementById('digitando');
  var form = document.getElementById('form');
  var campo = document.getElementById('pergunta');
  var chips = document.getElementById('chips');
  var motor = window.DantasIA;

  var BASE = null;

  /* --- utilidades ------------------------------------------------------- */

  function no(tag, cls, texto) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function hora() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function aoFim() { log.scrollTop = log.scrollHeight; }

  /* Situações que contam como feito. Mora aqui de propósito: existe uma
   * constante igual no app.js do mapa, e as duas telas mostram a mesma coluna
   * do mesmo CSV — mas o chat não pode depender de arquivo que não carrega. */
  var CONCLUIDA = /conclu|realizada|entregue/i;

  function registroPorId(id) {
    for (var i = 0; i < BASE.registros.length; i++) {
      if (BASE.registros[i].id === id) return BASE.registros[i];
    }
    return null;
  }

  /* --- balões ----------------------------------------------------------- */

  function balaoUsuario(texto) {
    var m = no('div', 'msg msg--eu');
    m.appendChild(no('div', 'balao', texto));
    m.appendChild(no('p', 'hora', hora()));
    log.appendChild(m);
    aoFim();
  }

  function chipFonte(fonte) {
    var c = no('span', 'fonte');
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '12');
    svg.setAttribute('height', '12');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', 'M6 3h9l4 4v14H6zM15 3v4h4');
    svg.appendChild(p);
    c.appendChild(svg);

    var rotulo = 'Fonte: ' + fonte.rotulo;
    if (fonte.url && /^https?:\/\//.test(fonte.url)) {
      var a = no('a', null, rotulo);
      a.href = fonte.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      c.appendChild(a);
    } else {
      c.appendChild(document.createTextNode(rotulo));
    }
    return c;
  }

  function balaoBot(texto, extras) {
    var m = no('div', 'msg');
    m.appendChild(no('div', 'balao', texto));
    if (extras) extras(m);
    m.appendChild(no('p', 'hora', hora()));
    log.appendChild(m);
    aoFim();
    return m;
  }

  function botoes(alvo, lista) {
    if (!lista.length) return;
    var caixa = no('div', 'opcoes');
    lista.forEach(function (b) {
      var btn = no('button', 'opcao' + (b.forte ? ' opcao--forte' : ''), b.rotulo);
      btn.type = 'button';
      btn.addEventListener('click', function () {
        caixa.remove();
        b.acao();
      });
      caixa.appendChild(btn);
    });
    alvo.appendChild(caixa);
    aoFim();
  }

  /* --- resposta --------------------------------------------------------- */

  var CONTATO_PENDENTE = 'O gabinete ainda não publicou um canal direto aqui no site. '
    + 'Enquanto isso, o caminho é o perfil do mandato no Instagram, @wellingtondantaspicos — '
    + 'ou registrar a demanda por aqui, que ela sai pronta para você enviar.';

  function mostrarRegistro(reg) {
    balaoBot(reg.resposta, function (m) {
      if (reg.fonte && reg.fonte.rotulo) m.appendChild(chipFonte(reg.fonte));

      var opcoes = [];
      if (reg.acao && reg.acao.tipo === 'formulario') {
        opcoes.push({ rotulo: reg.acao.rotulo, forte: true, acao: abrirFormulario });
      }
      if (reg.acao && reg.acao.tipo === 'ir') {
        opcoes.push({
          rotulo: reg.acao.rotulo,
          acao: function () { parent.postMessage({ tipo: 'ir', alvo: reg.acao.alvo }, location.origin); }
        });
      }
      (reg.seguintes || []).slice(0, 3).forEach(function (id) {
        var r = registroPorId(id);
        if (!r) return;
        if (r.pendente) {
          opcoes.push({ rotulo: r.titulo, acao: function () { balaoBot(CONTATO_PENDENTE); } });
          return;
        }
        opcoes.push({ rotulo: r.titulo, acao: function () { responderRegistro(r); } });
      });
      botoes(m, opcoes);
    });
  }

  function mostrarComposta(segundo) {
    var m = balaoBot('');
    m.querySelector('.balao').remove();
    var aviso = no('p', 'tambem');
    aviso.appendChild(document.createTextNode('Você também perguntou sobre '));
    aviso.appendChild(no('strong', null, segundo.titulo));
    aviso.appendChild(document.createTextNode('. Quer que eu responda isso agora?'));
    m.insertBefore(aviso, m.firstChild);
    botoes(m, [
      { rotulo: 'Sim, responda', forte: true, acao: function () { responderRegistro(segundo); } },
      { rotulo: 'Não, obrigado', acao: function () {} }
    ]);
  }

  function mostrarFallback() {
    var m = balaoBot('Não tenho isso confirmado em fonte pública, então não vou afirmar nada. '
      + 'Duas saídas: eu te mostro o que eu tenho, ou você registra isso como demanda do seu bairro e o gabinete recebe.');
    botoes(m, [
      { rotulo: 'Ver o que você tem', acao: mostrarIndice },
      { rotulo: 'Registrar demanda', forte: true, acao: abrirFormulario }
    ]);
  }

  function mostrarIndice() {
    var m = balaoBot('Isto é tudo que eu tenho, com fonte em cada item:');
    var opcoes = BASE.registros
      .filter(function (r) { return !r.pendente && !r.sistema; })
      .map(function (r) { return { rotulo: r.titulo, acao: function () { responderRegistro(r); } }; });
    botoes(m, opcoes);
  }

  /* Atraso curto de propósito: resposta instantânea parece formulário, não
   * conversa. Não é streaming falso — o texto já está pronto. */
  function comDelay(fn) {
    digitando.hidden = false;
    aoFim();
    var espera = 400 + Math.random() * 500;
    setTimeout(function () { digitando.hidden = true; fn(); }, espera);
  }

  function responderRegistro(reg) { comDelay(function () { mostrarRegistro(reg); }); }

  /* Resposta por bairro: monta a lista daquele bairro a partir do mesmo dado
   * que pinta o mapa. Bairro sem ação não devolve buraco — devolve a rota de
   * demanda, igual ao painel do mapa. */
  function mostrarBairro(b) {
    var n = b.itens.length;
    var m = balaoBot(n
      ? 'Em ' + b.nome + ' há ' + n + (n === 1 ? ' ação registrada' : ' ações registradas') + ':'
      : 'Não há ação registrada em ' + b.nome + ' neste levantamento. Isso não quer dizer que não haja demanda — quer dizer que ainda não entrou no registro.');

    if (n) {
      var ol = no('ol', 'painel__itens');
      b.itens.forEach(function (o) {
        var li = no('li');
        var t = no('div', 'painel__t');
        t.appendChild(no('span', 'painel__ano', o.ano));
        t.appendChild(no('span', 'tag', o.cat));
        t.appendChild(no('span', 'painel__sit' + (CONCLUIDA.test(o.sit) ? ' ok' : ''), o.sit));
        li.appendChild(t);
        li.appendChild(no('h4', null, o.titulo));
        li.appendChild(no('p', null, o.local + ' · ' + o.inst));
        li.appendChild(no('cite', null, 'Fonte: ' + o.fonte));
        ol.appendChild(li);
      });
      m.appendChild(ol);
      botoes(m, [
        { rotulo: 'Ver na lista de entregas', acao: function () { irPara('#entregas', b.filtro, b.nome); } },
        { rotulo: 'Registrar demanda daqui', forte: true, acao: abrirFormulario }
      ]);
    } else {
      botoes(m, [{ rotulo: 'Registrar demanda de ' + b.nome, forte: true, acao: abrirFormulario }]);
    }
  }

  function irPara(alvo, filtro, nome) {
    parent.postMessage({ tipo: 'ir', alvo: alvo, filtro: filtro, nome: nome }, location.origin);
  }

  function perguntar(texto) {
    balaoUsuario(texto);
    var r = motor.responder(texto, BASE);
    comDelay(function () {
      if (r.tipo === 'recusa') { balaoBot(r.resposta); mostrarIndice(); return; }
      if (r.tipo === 'bairro') { mostrarBairro(r.bairro); if (r.tambem) mostrarComposta(r.tambem); return; }
      if (r.tipo === 'fallback') { mostrarFallback(); return; }
      mostrarRegistro(r.registro);
      if (r.tambem) mostrarComposta(r.tambem);
    });
  }

  /* --- formulário de demanda -------------------------------------------- */

  /* O chat é anônimo enquanto é pergunta. No instante em que vira pedido, ele
   * para e pede identificação — dizendo para quê. Pergunta anônima não serve
   * ao gabinete se era um pedido de rua e não se sabe de quem, e pedir nome
   * sem dizer o motivo é coleta escondida. */
  function abrirFormulario() {
    var m = balaoBot('Isso eu não respondo pelo site, mas o gabinete responde. '
      + 'Me diga como te chamar e o WhatsApp para a resposta chegar em você — e onde é o problema.');
    var f = no('form', 'form-demanda');

    var campos = [
      { id: 'd-nome', rotulo: 'Como te chamar', tag: 'input' },
      { id: 'd-zap', rotulo: 'WhatsApp com DDD', tag: 'input' },
      { id: 'd-bairro', rotulo: 'Bairro', tag: 'input' },
      { id: 'd-rua', rotulo: 'Rua ou ponto de referência', tag: 'input' },
      { id: 'd-texto', rotulo: 'O que está acontecendo', tag: 'textarea' }
    ];
    campos.forEach(function (c) {
      var l = no('label', null, c.rotulo);
      l.htmlFor = c.id;
      var e = document.createElement(c.tag);
      e.id = c.id;
      e.required = true;
      if (c.tag === 'input') e.type = 'text';
      e.maxLength = c.tag === 'textarea' ? 600 : 120;
      f.appendChild(l);
      f.appendChild(e);
    });

    var enviar = no('button', 'opcao opcao--forte', 'Montar o texto');
    enviar.type = 'submit';
    f.appendChild(enviar);

    /* Finalidade declarada, embaixo do botão, onde a pessoa decide. */
    f.appendChild(no('p', 'form-demanda__aviso',
      'Nome e WhatsApp servem só para o gabinete te responder. Nada é enviado daqui: '
      + 'o texto é montado neste aparelho e quem envia é você.'));

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = {};
      var faltou = false;
      campos.forEach(function (c) {
        d[c.id] = document.getElementById(c.id).value.trim();
        if (!d[c.id]) faltou = true;
      });
      if (faltou) return;
      f.remove();
      montarDemanda(d);
    });

    m.appendChild(f);
    aoFim();
    document.getElementById('d-nome').focus();
  }

  /* Código da mensagem: data mais quatro caracteres. Não é protocolo de fila —
   * fila exige banco, e prometer número de acompanhamento que ninguém consulta
   * é pior que não ter. É identificador da mensagem, e a legenda diz isso. */
  function codigo() {
    var d = new Date();
    var iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    var letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var s = '';
    for (var i = 0; i < 4; i++) s += letras.charAt(Math.floor(Math.random() * letras.length));
    return 'PIC-' + iso + '-' + s;
  }

  function montarDemanda(d) {
    var cod = codigo();
    var msg = 'Demanda ' + cod + '\n'
      + 'Bairro: ' + d['d-bairro'] + '\n'
      + 'Local: ' + d['d-rua'] + '\n'
      + 'Descrição: ' + d['d-texto'] + '\n'
      + 'De: ' + d['d-nome'] + ' — WhatsApp ' + d['d-zap'] + '\n'
      + 'Canal: assistente do site';

    var m = balaoBot('Pronto. Guarde o código ' + cod + ' — é por ele que você cobra a resposta. '
      + 'O texto abaixo já vai com bairro, rua e o seu contato:');
    m.appendChild(no('div', 'balao', msg));

    var canal = BASE.canal || {};
    var opcoes = [];

    if (!canal.pendente && canal.tipo === 'whatsapp' && canal.valor) {
      opcoes.push({
        rotulo: 'Enviar no WhatsApp do gabinete', forte: true,
        acao: function () {
          parent.postMessage({
            tipo: 'abrir',
            url: 'https://wa.me/' + canal.valor + '?text=' + encodeURIComponent(msg)
          }, location.origin);
        }
      });
    } else if (!canal.pendente && canal.tipo === 'email' && canal.valor) {
      opcoes.push({
        rotulo: 'Enviar por e-mail', forte: true,
        acao: function () {
          parent.postMessage({
            tipo: 'abrir',
            url: 'mailto:' + canal.valor + '?subject=' + encodeURIComponent('Demanda ' + cod + ' — ' + d['d-bairro']) + '&body=' + encodeURIComponent(msg)
          }, location.origin);
        }
      });
    }

    opcoes.push({
      rotulo: 'Copiar o texto', forte: !opcoes.length,
      acao: function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(msg).then(
            function () { balaoBot('Copiado. Agora é só colar no canal do gabinete.'); },
            function () { balaoBot('Não consegui copiar sozinho — selecione o texto acima e copie.'); }
          );
        } else {
          balaoBot('Selecione o texto acima e copie.');
        }
      }
    });

    opcoes.push({
      rotulo: 'Abrir o Instagram do mandato',
      acao: function () {
        parent.postMessage({ tipo: 'abrir', url: 'https://www.instagram.com/wellingtondantaspicos/' }, location.origin);
      }
    });

    botoes(m, opcoes);

    if (canal.pendente) {
      balaoBot('O envio direto entra assim que o gabinete publicar o canal oficial. '
        + 'Enquanto isso, o texto acima já sai pronto — com bairro e rua, que é o que costuma faltar.');
    }
  }

  /* --- teclado e ciclo de vida ------------------------------------------- */

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      parent.postMessage({ tipo: 'fechar' }, location.origin);
    }
  });

  document.getElementById('fechar').addEventListener('click', function () {
    parent.postMessage({ tipo: 'fechar' }, location.origin);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var texto = campo.value.trim();
    if (!texto) return;
    campo.value = '';
    perguntar(texto);
  });

  window.addEventListener('message', function (e) {
    if (e.origin !== location.origin) return;
    if (e.data && e.data.tipo === 'foco') campo.focus();
  });

  /* --- carga ------------------------------------------------------------- */

  /* Ponte futura: no dia em que o site virar banco, só esta função troca — a
   * UI e o motor não sabem de onde vem a base. */
  function carregarBase() {
    return Promise.all([
      fetch('dados/assistente-base.json').then(function (r) {
        if (!r.ok) throw new Error('base indisponível');
        return r.json();
      }),
      /* O recorte por bairro é gerado do mesmo CSV que pinta o mapa. Se ele
       * faltar, o assistente perde só a resposta por bairro — não quebra. */
      fetch('dados/assistente-bairros.json').then(function (r) {
        return r.ok ? r.json() : null;
      }).catch(function () { return null; })
    ]).then(function (partes) {
      var base = partes[0];
      if (partes[1]) base.bairros = partes[1];
      return base;
    });
  }

  carregarBase().then(function (base) {
    BASE = motor.validar(base);

    document.getElementById('bot-nome').textContent = BASE.identidade.nome_bot;
    document.getElementById('bot-sub').textContent = BASE.identidade.subtitulo;
    document.getElementById('aviso').textContent = BASE.identidade.aviso_fixo;
    document.title = BASE.identidade.nome_bot + ' — assistente do mandato';

    (BASE.chips || []).forEach(function (id) {
      var r = registroPorId(id);
      if (!r || r.pendente) return;
      var b = no('button', 'chip', r.rotulo_curto || r.titulo);
      b.type = 'button';
      b.addEventListener('click', function () {
        balaoUsuario(r.titulo);
        responderRegistro(r);
      });
      chips.appendChild(b);
    });

    balaoBot(BASE.identidade.abertura);
    campo.focus();
  }).catch(function () {
    balaoBot('Não consegui carregar a base de informações agora. Tente de novo em instantes.');
  });
})();
