// Cria um novo post: npm run new -- "Título do artigo"
import { existsSync, writeFileSync } from 'node:fs';

// Mesma regra de src/lib/posts.ts
const slugify = (text) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
  console.error('Uso: npm run new -- "Título do artigo"');
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
const slug = slugify(title);
const file = new URL(`../src/content/posts/${date}-${slug}.md`, import.meta.url).pathname;
if (existsSync(file)) {
  console.error(`Já existe: ${file}`);
  process.exit(1);
}

writeFileSync(
  file,
  `---
title: ${JSON.stringify(title)}
description: ""
date: ${date}
author: rafael
categories: []
tags: []
# cover: "/assets/images/NNN_post/cover/NNN_blog.png"
draft: true
---

Escreva aqui. Fórmulas: $V = IR$ ou em bloco com $$...$$.
`,
);
console.log(`Criado: ${file}\nURL: /posts/${slug}/  (remova "draft: true" para publicar)`);
