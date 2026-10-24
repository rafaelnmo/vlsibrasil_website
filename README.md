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

- Imagens: coloque em `public/assets/images/...` e use `/assets/images/...`.
- Fórmulas: `$...$` e `$$...$$` (KaTeX).
- Código: blocos com ```` ```verilog ```` etc. já têm destaque de sintaxe e botão "copiar".
- Para converter posts antigos do Jekyll: `node scripts/migrate-jekyll.mjs caminho/post.md [--draft]`.

## Anúncios

Tudo em `ADS` no arquivo `src/config.ts`:

- **AdSense**: depois da aprovação, mude `adsense.enabled` para `true` e ajuste os IDs dos slots.
- **Patrocinador direto**: adicione uma entrada em `sponsors` para o slot desejado
  (`home-banner`, `post-sidebar`, `post-end`, `list-inline`). Ele tem prioridade sobre o AdSense.
- **Sem anúncio**: aparece um bloco "Anuncie aqui" levando para `/anuncie/` (desligue com `houseAds: false`).

## Publicação (GitHub Pages)

1. Suba este diretório para o repositório do site (branch `main`).
2. Em *Settings → Pages → Build and deployment*, escolha **Source: GitHub Actions**.
3. Cada push na `main` publica o site (`.github/workflows/deploy.yml`).
   O domínio continua configurado por `public/CNAME`.
