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

Publicar é `git push` na `main`. Voltar atrás é `git revert`.

### Um passo ainda pendente: ligar a Action

Hoje o Pages publica direto do branch `main`. O arquivo
`.github/workflows/publicar.yml` já está escrito, mas ainda **não foi enviado**:
o token do `gh` neste computador não tem o escopo `workflow`. Uma vez só, no
terminal:

```bash
gh auth refresh -h github.com -s workflow   # abre o navegador para autorizar
git add .github && git commit -m "liga a Action de publicação" && git push
```

Depois disso a régua passa a rodar no servidor a cada push — e editar
`dados/acoes.csv` pela web do GitHub passa a publicar sozinho, porque o gerador
roda lá. Enquanto isso não acontece, quem edita o CSV precisa rodar
`node scripts/gerar.mjs` antes do commit.

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

1. Retrato oficial — o site está sem fotografia por escolha, não por falta.
2. Endereços das matérias do clipping.
3. Canal de contato: WhatsApp do gabinete, grupo ou comunidade.
4. Domínio próprio.
5. Validação da copy — tudo que está escrito é proposta.
6. Junco tem três ações registradas e ainda não está no traçado do mapa.

---

**Riva's Alexandre** © 2026
Todos os direitos reservados. Código e conteúdo desta versão de apresentação
não podem ser reaproveitados sem autorização.
