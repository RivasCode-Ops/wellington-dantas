# Site do mandato — Wellington Dantas, vereador de Picos (PI)

Versão de apresentação. Site estático, sem framework, sem banco, sem servidor
de aplicação e **sem custo**: GitHub guarda, GitHub Actions verifica, GitHub
Pages publica.

## Como mexer

```bash
node servir.mjs      # http://localhost:5000 — gera o conteúdo e serve a pasta
node verificar.mjs   # a régua de prova; sai com erro se algo reprovar
node scripts/gerar.mjs   # só regerar o HTML a partir do CSV
```

Publicar é `git push` na `main`. A Action roda o gerador, roda a régua e sobe.
Se a régua reprovar, **o site não vai ao ar** — e o commit fica marcado com
falha. Voltar atrás é `git revert`.

Como o gerador roda no servidor, **editar `dados/acoes.csv` pela web do GitHub
já publica**: commit lá, site no ar em cerca de um minuto.

## O que tem dentro

```
index.html            a página, com o conteúdo já dentro (não busca nada na rede)
404.html              página de erro própria, autossuficiente
dados/acoes.csv       A FONTE. É este arquivo que se edita para publicar
dados/acoes.json      gerado a partir do CSV, para quem quiser o dado bruto
scripts/gerar.mjs     lê o CSV e escreve os blocos marcados do index.html
scripts/og.html       fonte da imagem de compartilhamento (img/og.png)
css/base.css          o CSS do mockup aprovado — intocado
css/site.css          o que o site ganhou depois do mockup
css/fontes.css        as duas fontes, servidas do próprio domínio
js/app.js             só filtra a lista que já está no HTML
verificar.mjs         a régua de prova
```

## O assistente (Wellington Dantas.IA)

Recuperação sobre base curada, **sem LLM e sem chave de API**. O motor não
escreve frase nenhuma: toda resposta está em `dados/assistente-base.json`, e
**registro factual sem `fonte` não carrega** — o console diz qual foi
descartado. É a regra do mapa aplicada ao texto.

```
js/assistente-launcher.js  botão na página; o chat só existe depois do 1º clique
assistente.html            documento do chat, dentro de <iframe sandbox>
js/assistente-motor.js     função pura: pergunta → registro. Testável sem navegador
js/assistente-ui.js        balões, chips, formulário de demanda
dados/assistente-base.json os 15 registros. É aqui que se edita o que o bot sabe
```

Três comportamentos que o distinguem do assistente que serviu de referência:
**pergunta composta** não é respondida pela metade em silêncio — ele avisa o que
ficou de fora; **"você é o vereador?"** tem registro próprio, em vez de cair no
genérico; e o **fallback tem saída** — quem pergunta o que ele não sabe é
convidado a registrar a demanda com bairro e rua.

Conformidade travada: ele não pede voto, não usa o número como pedido, não
promete obra futura, não fala em primeira pessoa pelo vereador e **não atribui
realização onde o CSV registra requerimento**. A régua reprova cada um desses.

## As decisões que valem a pena saber

**O conteúdo já vem no HTML.** Nada é buscado no navegador. A página funciona
com o JavaScript desligado, não pisca e não espera. O JS só filtra o que já
está lá. (O site que serviu de referência baixa 91 KB de JSON em toda visita
para montar a mesma lista.)

**O CSV é a fonte.** Editar `dados/acoes.csv` pela web do GitHub e dar commit
publica o site — sem painel, sem senha, sem banco, sem custo. Quando a equipe
do gabinete precisar editar sozinha, aí sim entra um painel de verdade.

**A régua reprova de verdade.** Peso da primeira carga, imagem sem `alt`, link
morto, arquivo que não existe, cartão de compartilhamento incompleto, fonte
remota, sombra projetada, gradiente de fundo, raio maior que 2px. Cada regra
nasceu de um defeito real.

**Primeira carga: ~113 KB**, fontes incluídas.

## O que falta, e é decisão do gabinete

1. **Retrato oficial — fotografia, e só fotografia.** O encaixe está pronto e
   esperando o arquivo:

   ```powershell
   powershell -File scripts\foto.ps1 -Origem "d:\caminho\foto-original.jpg"
   node scripts\gerar.mjs
   ```

   `foto.ps1` confere a procedência, recorta em 3:4, gera 1200 e 700 de largura
   dentro do teto de 250 KB; `gerar.mjs` põe o retrato no hero. Sem o arquivo, o
   hero fica de uma coluna e a página não referencia imagem que não existe.

   **Imagem gerada por IA só entra como provisória, e dizendo que é.** O hero
   hoje mostra um retrato gerado, aceito para a apresentação com
   `-Provisorio`: o arquivo se chama `wellington-provisorio-*.jpg`, a legenda
   diz *"imagem provisória, gerada por IA"* e o texto alternativo diz *"não é
   uma fotografia"*. **A régua barra a publicação definitiva enquanto ele
   estiver lá** — no dia em que o `noindex` sair, o site não sobe com retrato
   sintético de pessoa real.

   Sem `-Provisorio`, `scripts/procedencia.mjs` recusa a origem antes do
   recorte (depois não adianta: reencodar apaga o manifesto C2PA que denuncia).
   A imagem que chegou em 01/09/2026 traz manifesto assinado pela OpenAI Media
   Service API, `digitalSourceType = trainedAlgorithmicMedia` e marca-d'água
   embutida — é detectável por qualquer verificador de Content Credentials.
   **Chegando a fotografia oficial, ela entra com o nome sem "provisorio" e
   tudo isso sai sozinho.**
2. Endereços das matérias do clipping.
3. Canal de contato: WhatsApp do gabinete, grupo ou comunidade.
4. Domínio próprio.
5. Validação da copy — tudo que está escrito é proposta.
6. Junco tem três ações registradas e ainda não está no traçado do mapa.

---

**Riva's Alexandre** © 2026
Todos os direitos reservados. Código e conteúdo desta versão de apresentação
não podem ser reaproveitados sem autorização.
