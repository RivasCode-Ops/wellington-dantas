/* telas.mjs — captura as telas do guia de aprovação a partir do site RODANDO.
 *
 *   node servir.mjs            (noutro terminal)
 *   node scripts/telas.mjs
 *
 * Por que gerar e não tirar à mão: a apresentação mostra 20 telas do site, e o
 * site muda. Captura manual envelhece no primeiro commit e ninguém percebe —
 * o cliente aprova uma tela que não existe mais. Assim basta rodar de novo.
 *
 * Como funciona, e por que assim:
 *
 * O Chrome sem cabeça tira foto da JANELA, e `--window-size` mente: pedir 390
 * devolve outra largura, e o layout responsivo sai errado. Então cada tela é
 * capturada dentro de um <iframe> da largura exata, numa moldura servida pelo
 * próprio servidor — mesma origem, o que permite ao roteiro preencher a busca,
 * abrir o painel do mapa e conversar com o assistente antes do clique.
 *
 * A moldura tem a altura da seção alvo, então a foto sai já recortada.
 *
 * JPEG e não WebP: codificar WebP exigiria dependência, e a regra do projeto é
 * zero dependência. System.Drawing já é o que `foto.ps1` usa. Para captura de
 * tela com muito texto o custo do JPEG aparece nas bordas das letras — por
 * isso a qualidade sobe para 88 e a largura fica em 1200, que é o ponto em que
 * medi o texto ainda limpo e o arquivo abaixo de 250 KB.
 *
 * Zero dependência: só `node:*` e o Chrome que já está na máquina.
 *
 * Riva's Alexandre · 01/09/2026
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(RAIZ, 'img', 'apresentacao');
const BASE = process.env.WD_BASE || 'http://localhost:5000';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TMP = path.join(RAIZ, '.telas-tmp');

/* Cada tela: arquivo, página, largura da moldura, e o roteiro que roda DENTRO
 * do documento do site antes da foto. O roteiro devolve o elemento a
 * enquadrar; a moldura assume a altura dele. */
const TELAS = [
  { n: '01-hero', pag: '/', w: 1280, alvo: '.hero', comTopo: true },
  { n: '02-numeros', pag: '/', w: 1280, alvo: '#numeros' },
  { n: '03-origem', pag: '/', w: 1280, alvo: '#origem' },
  { n: '04-bandeira', pag: '/', w: 1280, alvo: '#bandeira' },
  {
    n: '05-entregas', pag: '/', w: 1280, alvo: '#entregas',
    roteiro: `var b=d.getElementById('busca')||d.querySelector('#entregas input[type=search]');
              if(b){b.value='Junco';b.dispatchEvent(new Event('input',{bubbles:true}));}`,
  },
  {
    n: '06-entregas-vazio', pag: '/', w: 1280, alvo: '#entregas',
    roteiro: `var b=d.getElementById('busca')||d.querySelector('#entregas input[type=search]');
              if(b){b.value='zzz';b.dispatchEvent(new Event('input',{bubbles:true}));}`,
  },
  {
    n: '07-mapa', pag: '/', w: 1280, alvo: '#territorio',
    roteiro: `var p=d.querySelector('[aria-label^="Paraibinha"]')||d.querySelector('.reg.on');
              if(p){p.dispatchEvent(new MouseEvent('mouseenter',{bubbles:true}));p.dispatchEvent(new MouseEvent('click',{bubbles:true}));}`,
  },
  { n: '08-como-funciona', pag: '/', w: 1280, alvo: '#como-funciona' },
  { n: '09-camara', pag: '/', w: 1280, alvo: '#camara' },
  { n: '10-recursos', pag: '/', w: 1280, alvo: '#recursos' },
  { n: '11-midia', pag: '/', w: 1280, alvo: '#midia' },
  { n: '12-participe', pag: '/', w: 1280, alvo: '#participe' },
  {
    n: '13-trajetoria-votos', pag: '/trajetoria.html', w: 1280, h: 720, espera: 1400,
    roteiro: `var s=d.querySelectorAll('.barra__s'); if(s[5]) s[5].click();
              var b=d.getElementById('pausar'); if(b && b.textContent.trim()==='Pausar') b.click();`,
  },
  {
    n: '14-trajetoria-fecho', pag: '/trajetoria.html', w: 1280, h: 720, espera: 1400,
    roteiro: `var s=d.querySelectorAll('.barra__s'); if(s[7]) s[7].click();`,  /* o fecho já para sozinho */
  },
  { n: '15-ia-chips', pag: '/assistente.html', w: 420, h: 760, espera: 900 },
  {
    n: '16-ia-bairro', pag: '/assistente.html', w: 420, h: 760, espera: 1200,
    roteiro: `var f=d.querySelector('form'); var i=d.querySelector('input[type=text],input:not([type])');
              if(i&&f){i.value='o que foi feito no Paraibinha'; f.requestSubmit();}`,
  },
  {
    n: '17-ia-voto', pag: '/assistente.html', w: 420, h: 760, espera: 1200,
    roteiro: `var f=d.querySelector('form'); var i=d.querySelector('input[type=text],input:not([type])');
              if(i&&f){i.value='em quem devo votar?'; f.requestSubmit();}`,
    /* O chat rola para o fim, e a recusa fica acima da mensagem seguinte. Sem
     * isto a tela mostrava a lista de assuntos e não a recusa — que é
     * justamente a prova que esta captura existe para dar. */
    depois: `var b=d.querySelectorAll('.balao');
             for(var k=0;k<b.length;k++){ if(b[k].textContent.indexOf('Não oriento voto')===0){ b[k].scrollIntoView({block:'center'}); break; } }`,
  },
  {
    n: '18-ia-demanda', pag: '/assistente.html', w: 420, h: 900, espera: 1600,
    roteiro: `var f=d.querySelector('form'); var i=d.querySelector('input[type=text],input:not([type])');
              if(i&&f){i.value='quero registrar uma demanda'; f.requestSubmit();}`,
  },
  { n: '19-mobile-home', pag: '/', w: 390, h: 844, espera: 700 },
  {
    n: '20-mobile-mapa', pag: '/', w: 390, h: 844, espera: 700,
    /* scrollIntoView herda o scroll-behavior:smooth do site e não chega */
    roteiro: `d.documentElement.style.scrollBehavior='auto';
              var t=d.getElementById('territorio');
              if(t) w.scrollTo(0, t.getBoundingClientRect().top + w.scrollY);`,
  },
];

/* A moldura. Same-origin com o site, para o roteiro poder tocar no documento
 * de dentro. Ela mesma reporta a altura escolhida num <title>, e o processo lê
 * isso do nome do arquivo depois — mas como não dá para ler o title de fora,
 * a altura é decidida aqui: quando há `alvo`, a moldura se ajusta sozinha e
 * avisa via `document.title`, e o recorte final vem do próprio iframe. */
function moldura(t) {
  const alturaFixa = t.h || 0;
  return `<!doctype html><meta charset="utf-8"><title>tela</title>
<style>html,body{margin:0;background:#F3F5F7}iframe{border:0;display:block;width:${t.w}px;height:${alturaFixa || 400}px}</style>
<iframe id="f" src="${t.pag}"></iframe>
<script>
var t = document.getElementById('f');
t.onload = function () {
  var d = t.contentDocument, w = t.contentWindow;
  try { ${t.roteiro || ''} } catch (e) { document.title = 'ERRO ' + e.message; }
  setTimeout(function () {
    ${t.alvo ? `
    var alvo = d.querySelector('${t.alvo}');
    if (alvo) {
      var r = alvo.getBoundingClientRect();
      var topo = r.top + w.scrollY;
      t.style.height = Math.min(Math.ceil(r.height), 2400) + 'px';
      /* scroll-behavior:smooth está no html do site, e rolagem suave anda em
       * requestAnimationFrame — que num Chrome sem compositor não roda. Metade
       * das telas saía mostrando o hero: o scroll era pedido e nunca acontecia.
       * É o mesmo defeito do motor da trajetória, com outra roupa: relógio de
       * pintura fazendo trabalho que não é de pintura. */
      d.documentElement.style.scrollBehavior = 'auto';
      var cab = d.querySelector('.topo');
      if (cab && ${t.comTopo ? 'false' : 'true'}) cab.style.position = 'static';
      setTimeout(function () { w.scrollTo(0, topo); document.title = 'pronto'; }, 60);
    }` : `
    document.title = 'pronto';`}
    /* o lançador do assistente aparece em toda tela da home e polui o recorte */
    var fab = d.querySelector('.ia-fab'); if (fab) fab.style.display = 'none';
    try { ${t.depois || ''} } catch (e) { document.title = 'ERRO ' + e.message; }
  }, ${t.espera || 500});
};
</script>`;
}

function chrome(url, destino, w, h) {
  execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${w + 2},${h + 2}`,
    '--virtual-time-budget=14000',
    `--screenshot=${destino}`,
    url,
  ], { stdio: 'ignore' });
}

/* PNG → JPEG com System.Drawing, que é o que foto.ps1 já usa. */
function paraJpeg(png, jpg, larguraMax, qualidade) {
  const ps = `
Add-Type -AssemblyName System.Drawing
$i = [System.Drawing.Image]::FromFile('${png.replace(/\//g, '\\')}')
$w = $i.Width; $h = $i.Height
if ($w -gt ${larguraMax}) { $h = [int]($h * ${larguraMax} / $w); $w = ${larguraMax} }
$b = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($b)
$g.InterpolationMode = 'HighQualityBicubic'
$g.PixelOffsetMode = 'HighQuality'
$g.DrawImage($i, 0, 0, $w, $h)
$cod = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$par = New-Object System.Drawing.Imaging.EncoderParameters 1
$par.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, ${qualidade})
$b.Save('${jpg.replace(/\//g, '\\')}', $cod, $par)
$g.Dispose(); $b.Dispose(); $i.Dispose()
Write-Output "$w $h"`;
  const saida = execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
  const [w, h] = saida.trim().split(/\s+/).map(Number);
  return { w, h };
}

/* Refazer uma tela só: WD_TELAS=07-mapa,17-ia-voto node scripts/telas.mjs
 * Vinte capturas levam minutos; consertar o enquadramento de uma não pode
 * custar as outras dezenove. As medidas das que não rodaram são preservadas. */
const FILTRO = (process.env.WD_TELAS || '').split(',').map((x) => x.trim()).filter(Boolean);
const LISTA = FILTRO.length ? TELAS.filter((t) => FILTRO.includes(t.n)) : TELAS;
if (FILTRO.length && LISTA.length !== FILTRO.length) {
  throw new Error(`WD_TELAS pede telas que não existem: ${FILTRO.filter((f) => !TELAS.some((t) => t.n === f)).join(', ')}`);
}

fs.mkdirSync(SAIDA, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const arqMedidas = path.join(SAIDA, 'medidas.json');
const medidas = fs.existsSync(arqMedidas) ? JSON.parse(fs.readFileSync(arqMedidas, 'utf8')) : {};
let total = 0;

for (const t of LISTA) {
  const arqMoldura = path.join(TMP, t.n + '.html');
  fs.writeFileSync(arqMoldura, moldura(t), 'utf8');

  const png = path.join(TMP, t.n + '.png');
  /* Altura da janela: quando a tela tem alvo, não se sabe a altura antes de
   * medir. Duas passadas — a primeira descobre, a segunda enquadra. */
  let alturaJanela = t.h || 2400;
  chrome(`${BASE}/.telas-tmp/${t.n}.html`, png, t.w, alturaJanela);

  if (t.alvo) {
    /* recorta o vazio embaixo: a moldura pintou papel onde a seção acabou */
    const ps = `
Add-Type -AssemblyName System.Drawing
$i=[System.Drawing.Image]::FromFile('${png.replace(/\//g, '\\')}')
$b=New-Object System.Drawing.Bitmap $i
$fundo=$b.GetPixel(2, $b.Height-3)
$corte=$b.Height
for($y=$b.Height-3; $y -gt 10; $y--){
  $dif=$false
  for($x=4; $x -lt $b.Width; $x+=37){ $p=$b.GetPixel($x,$y); if([Math]::Abs($p.R-$fundo.R)+[Math]::Abs($p.G-$fundo.G)+[Math]::Abs($p.B-$fundo.B) -gt 12){$dif=$true;break} }
  if($dif){ $corte=[Math]::Min($y+24,$b.Height); break }
}
$o=New-Object System.Drawing.Bitmap $b.Width, $corte
$g=[System.Drawing.Graphics]::FromImage($o)
$g.DrawImage($b,(New-Object System.Drawing.Rectangle 0,0,$b.Width,$corte),(New-Object System.Drawing.Rectangle 0,0,$b.Width,$corte),[System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose(); $b.Dispose(); $i.Dispose()
$o.Save('${png.replace(/\//g, '\\')}.crop.png'); $o.Dispose()
Write-Output $corte`;
    execFileSync('powershell', ['-NoProfile', '-Command', ps], { encoding: 'utf8' });
    fs.renameSync(png + '.crop.png', png);
  }

  const jpg = path.join(SAIDA, t.n + '.jpg');
  const m = paraJpeg(png, jpg, Math.min(t.w, 1200), 88);
  medidas[t.n] = m;
  total += fs.statSync(jpg).size;
  console.log(`  ${t.n}.jpg  ${m.w}x${m.h}  ${(fs.statSync(jpg).size / 1024).toFixed(0)} KB`);
}

fs.writeFileSync(arqMedidas, JSON.stringify(medidas, null, 2) + '\n', 'utf8');
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\ntelas: ${TELAS.length} · total ${(total / 1024 / 1024).toFixed(2)} MB · medidas em img/apresentacao/medidas.json`);
