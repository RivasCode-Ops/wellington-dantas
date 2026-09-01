# Como publicar uma ação nova no site

Sem programa instalado, sem senha de servidor, sem custo. Você edita uma
planilha de texto pelo navegador e o site se atualiza sozinho em cerca de um
minuto.

## O passo a passo

> **Enquanto a Action de publicação não estiver ligada** (ver o README), quem
> edita o CSV precisa rodar `node scripts/gerar.mjs` antes do commit. Depois de
> ligada, o passo a passo abaixo vale como está.

1. Abra `dados/acoes.csv` aqui no GitHub.
2. Clique no lápis (**Edit this file**), no canto de cima à direita.
3. Vá até o fim e escreva **uma linha nova**, seguindo a ordem das colunas.
4. Clique em **Commit changes** e escreva o que mudou. Ex.: *"acrescenta
   iluminação da Rua do Carmo"*.
5. Pronto. Em torno de um minuto o site já está no ar com a ação nova.

## A ordem das colunas

Os campos são separados por **ponto-e-vírgula** (`;`). Nunca use ponto-e-vírgula
dentro do texto — se usar, a verificação reprova e o site não sobe.

| Coluna | O que é | Exemplo |
|---|---|---|
| `id` | número seguinte ao da última linha | `28` |
| `bairro` | o bairro. Mais de um, separado por barra vertical `\|` | `Junco` |
| `local` | onde exatamente, com a rua ou o ponto de referência | `Rua Pedro Claro (bairro Junco)` |
| `tipo_local` | `rua`, `bairro`, `praca`, `avenida`, `rodovia`, `conjunto`, `rotatoria`, `corredor`, `municipio`, `regiao` | `rua` |
| `acao` | o que foi pedido, feito ou entregue | `Instalação de três redutores de velocidade` |
| `categoria` | o assunto: `Iluminação`, `Trânsito`, `Limpeza`, `Mulheres`, `Inclusão`, `Praça e lazer`, `Habitação`, `Honraria`, `Qualificação`, `Assistência` | `Trânsito` |
| `data` | **ano-mês-dia**, sempre nessa ordem | `2026-09-01` |
| `instrumento` | `Requerimento`, `Projeto de Lei`, `Decreto Legislativo`, `Entrega`, `Mobilização`, `Articulação`, `Apoio` | `Requerimento` |
| `situacao` | a verdade do momento: `protocolado`, `em votação`, `1ª votação`, `em curso`, `concluída`, `realizada`, `arquivado` | `protocolado` |
| `fonte` | de onde saiu a informação | `Boletim CMP nº 16/2026` |
| `evidencia` | `relatado` (só documento) ou `medido` (com foto ou registro) | `relatado` |

## Duas regras que não se dobram

**Situação é a verdade, não a vontade.** Se está parado, escreva `protocolado`.
Se foi arquivado, escreva `arquivado`. Um site de mandato que só mostra vitória
é panfleto — e o eleitor de Picos percebe.

**Toda linha tem fonte.** Se você não sabe de onde saiu, a linha não entra. É
o que separa este site de propaganda.

## Se der errado

O site não sobe quando a verificação reprova — e isso é proteção, não defeito.
Na aba **Actions** do repositório, o item vermelho mostra em uma linha o que
está errado (quase sempre: ponto-e-vírgula no meio do texto, ou uma coluna
faltando). Corrija a linha e dê commit de novo.

Nada quebra em definitivo: o site no ar continua o de antes até o novo passar.

---

**Riva's Alexandre** © 2026
Todos os direitos reservados.
