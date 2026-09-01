# Wellington Dantas — prepara o retrato do hero.
#
#   powershell -File scripts\foto.ps1 -Origem "d:\caminho\foto-original.jpg"
#   powershell -File scripts\foto.ps1 -Origem "..." -Foco 0.48 -Topo 0.02
#
# Recorta a foto em 3:4 (o formato do retrato no hero), gera duas larguras e
# grava em img\wellington-1200.jpg e img\wellington-700.jpg. Depois é só rodar
# `node scripts\gerar.mjs` — o retrato entra sozinho no index.html.
#
# -Foco  0..1  onde está o rosto na horizontal (0.5 = centro)
# -Topo  0..1  quanto cortar do alto antes de recortar (0 = nada)
#
# Sem dependência instalada: usa o System.Drawing do próprio Windows.
# O teto é 250 KB por arquivo — é o que a régua (verificar.mjs) aceita.
#
# Riva's Alexandre · 01/09/2026

param(
  [Parameter(Mandatory = $true)][string]$Origem,
  [double]$Foco = 0.5,
  [double]$Topo = 0.0,
  [int]$Qualidade = 82,
  # Aceita imagem gerada por IA COMO PROVISÓRIA. Os arquivos saem com
  # "provisorio" no nome, o site publica a legenda dizendo o que é, e a régua
  # barra a saída do modo apresentação enquanto ela estiver no lugar.
  [switch]$Provisorio
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $Origem)) { throw "não achei o arquivo: $Origem" }

# Procedência ANTES do recorte, e não depois: reencodar a imagem apaga o
# manifesto C2PA. Se a conferência ficasse só na régua, um retrato gerado por
# IA entraria limpo — sem o metadado que o denuncia, mas ainda falso.
# `Continue` só aqui: com `Stop`, o texto que o node manda para stderr vira
# erro de terminação do PowerShell e esconde a mensagem que interessa.
$antes = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
& node (Join-Path $PSScriptRoot 'procedencia.mjs') $Origem 2>&1 | ForEach-Object { Write-Output $_.ToString() }
$gerada = $LASTEXITCODE -ne 0
$ErrorActionPreference = $antes
if ($gerada -and -not $Provisorio) {
  throw "origem gerada por IA. Para usar como retrato provisório de apresentação, repita com -Provisorio. Nenhum arquivo foi gravado."
}
if ($gerada) {
  Write-Output ''
  Write-Output 'PROVISORIO: a imagem entra rotulada no site e a regua barra a publicacao definitiva ate chegar fotografia.'
}
$prefixo = if ($gerada) { 'wellington-provisorio' } else { 'wellington' }

$raiz = Split-Path -Parent $PSScriptRoot
$destino = Join-Path $raiz 'img'
$src = [System.Drawing.Image]::FromFile((Resolve-Path $Origem))

try {
  # --- recorte 3:4, ancorado no rosto -------------------------------------
  $cortaTopo = [int]($src.Height * $Topo)
  $alturaUtil = $src.Height - $cortaTopo
  $larguraCorte = [int]($alturaUtil * 0.75)

  if ($larguraCorte -gt $src.Width) {
    # origem mais estreita que 3:4: manda a largura e recalcula a altura
    $larguraCorte = $src.Width
    $alturaUtil = [int]($larguraCorte / 0.75)
    if ($cortaTopo + $alturaUtil -gt $src.Height) { $alturaUtil = $src.Height - $cortaTopo }
  }

  $x = [int]($src.Width * $Foco - $larguraCorte / 2)
  $x = [Math]::Max(0, [Math]::Min($x, $src.Width - $larguraCorte))
  $recorte = New-Object System.Drawing.Rectangle($x, $cortaTopo, $larguraCorte, $alturaUtil)

  Write-Output ("origem {0}x{1} · recorte {2}x{3} a partir de x={4} y={5}" -f $src.Width, $src.Height, $larguraCorte, $alturaUtil, $x, $cortaTopo)

  # --- codificador JPEG com qualidade ------------------------------------
  $jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
  $par = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $par.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [int]$Qualidade)

  foreach ($largura in @(1200, 700)) {
    $altura = [int]($largura / 0.75)
    $bmp = New-Object System.Drawing.Bitmap($largura, $altura)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($src, (New-Object System.Drawing.Rectangle(0, 0, $largura, $altura)), $recorte, [System.Drawing.GraphicsUnit]::Pixel)

    $arquivo = Join-Path $destino ("{0}-{1}.jpg" -f $prefixo, $largura)
    $bmp.Save($arquivo, $jpeg, $par)
    $g.Dispose(); $bmp.Dispose()

    $kb = [Math]::Round((Get-Item $arquivo).Length / 1KB, 1)
    $aviso = if ($kb -gt 250) { '  ← ACIMA DO TETO: baixe a qualidade' } else { '' }
    Write-Output ("img\{0}-{1}.jpg · {2}x{3} · {4} KB{5}" -f $prefixo, $largura, $largura, $altura, $kb, $aviso)
  }
}
finally {
  $src.Dispose()
}

Write-Output ''
Write-Output 'agora: node scripts\gerar.mjs  →  o retrato entra no index.html'
