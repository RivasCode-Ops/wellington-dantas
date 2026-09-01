/* Trajetória, comportamento — "Da rua pra Câmara".
 *
 * Oito telas cheias em rolagem, com trilho de progresso, contadores e parallax.
 * Extraído do arquivo único entregue pelo desenho; as fontes saíram do base64
 * porque o site já as serve de css/fontes.css — reembutir custaria 64 KB por
 * página só para repetir arquivo que o navegador já tem em cache.
 *
 * SEM VÍDEO DE FUNDO, e o número é o argumento: 21 fps medidos no site
 * tocomciro111.com em 01/09/2026, com vídeo de fundo rodando — e o contador
 * de lá está codado certo, em requestAnimationFrame. A suavidade é refém do
 * orçamento de quadros da página inteira. Aqui só animam transform e opacity.
 *
 * "Vídeo de fundo derruba a performance" alguém rebate na primeira reunião.
 * "21 fps medidos em 01/09/2026" é mais difícil.
 */
(function(){
 var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 var cenas = document.querySelectorAll('[data-cena]');
 if (reduz){ cenas.forEach(function(c){c.classList.add('is-vis')}); return; }

 /* Os números nascem escritos no HTML. Quem zera é este bloco, e só para o que
  * ainda está FORA da tela — o que já está visível no carregamento fica com o
  * valor certo e nunca anima.
  *
  * É o defeito que medimos na referência: lá o contador mostra o número final,
  * cai para zero e sobe, 351 ms com o valor certo na tela antes do reset. O
  * erro é de ordem — zerar na hora em que entra na tela, quando já está
  * visível. */
 document.querySelectorAll('[data-conta]').forEach(function(n){
  var r = n.getBoundingClientRect();
  if (r.top < innerHeight && r.bottom > 0) { n.dataset.feito='1'; return; }
  n.textContent = '0';
 });

 var io = new IntersectionObserver(function(es){
  es.forEach(function(e){
   if(!e.isIntersecting) return;
   e.target.classList.add('is-vis');
   e.target.querySelectorAll('[data-conta]').forEach(function(n){
    if(n.dataset.feito) return; n.dataset.feito='1';
    var alvo=+n.dataset.conta, ini=null, dur= alvo>100 ? 1400 : 700;
    function passo(t){
     if(!ini) ini=t;
     var p=Math.min((t-ini)/dur,1), e2=1-Math.pow(1-p,3);
     n.textContent=Math.round(alvo*e2).toLocaleString('pt-BR');
     if(p<1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
   });
   io.unobserve(e.target);
  });
 },{threshold:.28});
 cenas.forEach(function(c){io.observe(c)});

 var trilho=document.getElementById('trilho'), tick=false;
 function pinta(){
  var h=document.documentElement.scrollHeight-window.innerHeight;
  var p=h>0 ? window.scrollY/h : 0;
  trilho.style.height=(p*100).toFixed(2)+'%';
  tick=false;
 }
 window.addEventListener('scroll',function(){if(!tick){requestAnimationFrame(pinta);tick=true}},{passive:true});
 pinta();

 var ph=document.querySelector('.fundo__ph'), tick2=false;
 if(ph){
  window.addEventListener('scroll',function(){
   if(tick2) return; tick2=true;
   requestAnimationFrame(function(){ ph.style.transform='translateY('+(window.scrollY*0.16).toFixed(1)+'px)'; tick2=false; });
  },{passive:true});
 }
})();
