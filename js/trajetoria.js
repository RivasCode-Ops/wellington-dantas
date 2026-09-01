/* Trajetória, comportamento — "Da rua pra Câmara".
 *
 * Oito telas cheias em rolagem, com trilho de progresso, contadores e parallax.
 * Extraído do arquivo único entregue pelo desenho; as fontes saíram do base64
 * porque o site já as serve de css/fontes.css — reembutir custaria 64 KB por
 * página só para repetir arquivo que o navegador já tem em cache.
 *
 * Sem vídeo de fundo de propósito: a medição do site de referência mostrou 21
 * fps com vídeo rodando. Aqui só animam transform e opacity.
 */
(function(){
 var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 var cenas = document.querySelectorAll('[data-cena]');
 if (reduz){ cenas.forEach(function(c){c.classList.add('is-vis')}); return; }

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
