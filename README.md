# VLSI Brasil — v2

Novo site do [vlsibrasil.com.br](https://vlsibrasil.com.br), feito com [Astro](https://astro.build).
Continua sendo um site estático hospedado de graça no GitHub Pages.

## Comandos

Requer Node.js 22.22+.

| Comando                          | O que faz                                          |
| -------------------------------- | -------------------------------------------------- |
| `npm install`                    | instala as dependências (uma vez)                  |
| `npm run dev`                    | servidor local em http://localhost:4321 (mostra rascunhos) |
| `npm run build`                  | gera o site final em `dist/`                       |
| `npm run preview`                | serve o `dist/` localmente                         |
| `npm run new -- "Título"`        | cria um novo post como rascunho                    |

## Escrevendo posts

Posts ficam em `src/content/posts/AAAA-MM-DD-slug.md`. A URL é `/posts/slug/` (igual ao site antigo).
A data do nome do arquivo não aparece no site: só o slug é usado na URL
(`2025-03-11-asap7-pdk.md` → `/posts/asap7-pdk/`). A data exibida é a do campo `date`.

Cada post começa com um bloco de configuração entre `---`:

```yaml
---
title: "Arquivo LEF"
description: "Resumo usado nos cards e no Google (opcional)"
date: 2023-12-01
author: rafael
categories: ["Arquivos", "LEF"]   # a primeira é a categoria principal
tags: ["Backend"]
cover: "/assets/images/000_post/cover/000_blog.png"
featured: true                     # aparece em "Em destaque" na home
draft: true                        # não é publicado
---
```

`draft: true` faz o post aparecer só no `npm run dev`, nunca no site publicado.
Para publicar, apague essa linha (ou use `draft: false`).

### Publicar um rascunho (ex.: ASAP7)

1. Abra `src/content/posts/2025-03-11-asap7-pdk.md` e apague a linha `draft: true`.
2. Se quiser a data de hoje como data de publicação, atualize `date:`.
3. Confira: `npm run dev` e abra http://localhost:4321/posts/asap7-pdk/.
4. Publique:
   ```bash
   npm run build      # se der erro aqui, daria erro no GitHub também
   git add src/content/posts/2025-03-11-asap7-pdk.md
   git commit -m "[Post] Publishing ASAP7 PDK"
   git push
   ```
   Em uns 2 minutos está no ar.

### Escrever um post novo do zero

```bash
npm run new -- "Análise de Timing com OpenSTA"
```

Cria `src/content/posts/<data-de-hoje>-analise-de-timing-com-opensta.md` já com o bloco
de configuração e `draft: true`. Escreva, confira com `npm run dev`, apague `draft: true`
e faça build/commit/push como acima.

### Já tenho o post escrito

- **Markdown comum**: copie para `src/content/posts/` com o nome `AAAA-MM-DD-slug.md`
  e adicione o bloco de configuração no topo.
- **Post antigo do Jekyll** (ex.: os de `../_posts_bkp/`): converta automaticamente.
  ```bash
  node scripts/migrate-jekyll.mjs ../_posts_bkp/2023-01-13-arquivo-def.md --draft
  ```
  Ele grava em `src/content/posts/` e corrige caminhos de imagens e vídeos do YouTube.
  Depois confira com `npm run dev`, apague `draft: true` e publique.

### Imagens, fórmulas e código

- Imagens: coloque em `public/assets/images/NNN_post/` e use sem o `public`:
  `![diagrama](/assets/images/013_post/image_1.png)`.
- Fórmulas: `$V = IR$` na linha, ou `$$ ... $$` em bloco (KaTeX).
- Código: blocos com ```` ```verilog ```` etc. já têm destaque de sintaxe e botão "copiar".

Sempre rode `npm run build` antes do push: ele acusa erros no bloco de configuração
(falta de `title`, data inválida etc.) antes de o site ser publicado.

## Anúncios

Tudo em `ADS` no arquivo `src/config.ts`:

- **AdSense**: depois da aprovação, mude `adsense.enabled` para `true` e ajuste os IDs dos slots.
- **Patrocinador direto**: adicione uma entrada em `sponsors` para o slot desejado
  (`home-banner`, `post-sidebar`, `post-end`, `list-inline`). Ele tem prioridade sobre o AdSense.
- **Sem anúncio**: aparece um bloco "Anuncie aqui" levando para `/anuncie/` (desligue com `houseAds: false`).

## Publicação (GitHub Pages)

Já está configurado: cada push na `main` publica o site (`.github/workflows/deploy.yml`).
O andamento aparece na aba *Actions* do GitHub. O domínio é configurado por `public/CNAME`.

- Se o git reclamar de *dubious ownership* (o HD externo pertence ao root), rode uma vez:
  `git config --global --add safe.directory '*'`.
- Versões: crie uma tag (`git tag -a v0.3.0 -m "..."` e `git push origin v0.3.0`) e escreva
  a release em *Releases → Draft a new release*, escolhendo a tag existente.
