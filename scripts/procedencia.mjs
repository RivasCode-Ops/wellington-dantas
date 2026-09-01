/* Wellington Dantas — procedência de imagem.
 *
 *   node scripts/procedencia.mjs img/foto.jpg [outra.png ...]
 *
 * Sai com 1 se alguma imagem trouxer marca de conteúdo gerado por IA.
 *
 * Por que isto existe: em 01/09/2026 chegou para o site um retrato do vereador
 * na tribuna. O arquivo trazia um manifesto C2PA assinado pela OpenAI, com
 * `digitalSourceType = trainedAlgorithmicMedia` e uma marca-d'água embutida —
 * era imagem gerada, não fotografia. Num site de mandato, retrato sintético de
 * pessoa real é falsificação, e uma falsificação que qualquer verificador de
 * Content Credentials denuncia em segundos.
 *
 * A régua não pergunta: barra. E barra também no `foto.ps1`, antes do recorte,
 * porque reencodar a imagem apaga o metadado e limparia o rastro sem limpar o
 * problema.
 *
 * O que NÃO é motivo de reprovação: manifesto C2PA por si só. Câmera e editor
 * sérios também assinam — isso é procedência boa. O que reprova é a origem
 * declarada ser um modelo generativo.
 *
 * Zero dependência: só `node:fs`.
 *
 * Riva's Alexandre · 01/09/2026
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/* Códigos do IPTC que declaram origem em modelo generativo. */
const GERADO = [
  'trainedAlgorithmicMedia',
  'compositeWithTrainedAlgorithmicMedia',
  'algorithmicMedia',
];

export function conferir(arquivo) {
  const bytes = fs.readFileSync(arquivo);
  const texto = bytes.toString('latin1');

  const achados = GERADO.filter((c) => texto.includes(c));
  const temC2pa = texto.includes('c2pa.assertions') || texto.includes('jumdc2pa');
  const marcaDagua = texto.includes('c2pa.watermarked');

  /* No CBOR do manifesto, `dnamex` vem seguido de um byte de comprimento e do
   * nome do gerador; por isso o `.{1}` antes da captura. */
  const gerador = /dnamex.{1}([A-Za-z][\w .,-]{4,60}?)dicon/.exec(texto);
  const modelo = /ei([a-z][a-z0-9-]{2,20})gversion/.exec(texto);

  return {
    arquivo,
    gerada: achados.length > 0,
    codigos: achados,
    temC2pa,
    marcaDagua,
    gerador: gerador ? gerador[1].trim() : null,
    modelo: modelo ? modelo[1] : null,
  };
}

/* --- linha de comando --------------------------------------------------- */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const alvos = process.argv.slice(2);
  if (!alvos.length) {
    console.error('uso: node scripts/procedencia.mjs <arquivo de imagem> [...]');
    process.exit(2);
  }
  let reprovou = false;
  for (const alvo of alvos) {
    if (!fs.existsSync(alvo)) { console.error(`não achei: ${alvo}`); process.exit(2); }
    const r = conferir(alvo);
    const nome = path.basename(alvo);
    if (r.gerada) {
      reprovou = true;
      console.error(`REPROVA ${nome}: imagem gerada por IA`);
      console.error(`        origem declarada: ${r.codigos.join(', ')}`);
      if (r.gerador) console.error(`        gerador: ${r.gerador}${r.modelo ? ' · modelo ' + r.modelo : ''}`);
      if (r.marcaDagua) console.error('        e traz marca-d\'água embutida — a falsificação é detectável por terceiros');
    } else if (r.temC2pa) {
      console.log(`ok      ${nome}: tem Content Credentials e a origem não é modelo generativo${r.gerador ? ' (' + r.gerador + ')' : ''}`);
    } else {
      console.log(`ok      ${nome}: sem marca de geração por IA`);
    }
  }
  process.exit(reprovou ? 1 : 0);
}
