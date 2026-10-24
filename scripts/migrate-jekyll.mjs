// Converte posts do Jekyll/Chirpy para o formato do novo site (Astro).
// Uso: node scripts/migrate-jekyll.mjs <post.md> [--draft] [...]
// Os arquivos convertidos são gravados em src/content/posts/.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const OUT_DIR = new URL('../src/content/posts/', import.meta.url).pathname;

const args = process.argv.slice(2);
const forceDraft = args.includes('--draft');
const files = args.filter((a) => !a.startsWith('--'));

function parseList(value) {
  // "[ Arquivos, LEF ]" -> ["Arquivos", "LEF"]
  const m = value.match(/^\[(.*)\]$/);
  if (!m) return value ? [value.trim()] : [];
  return m[1].split(',').map((s) => s.trim()).filter(Boolean);
}

function unquote(value) {
  return value.trim().replace(/^["'](.*)["']$/, '$1');
}

function convertBody(body) {
  return body
    // kramdown IAL: ![x](y){: width="972" .responsive-img} -> ![x](y)
    .replace(/\{:[^}]*\}/g, '')
    // Chirpy YouTube embed
    .replace(
      /\{%\s*include embed\/youtube\.html id='([^'?]+)[^']*'\s*%\}/g,
      '<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/$1" title="Vídeo do YouTube" loading="lazy" allowfullscreen></iframe></div>',
    )
    // Liquid relative_url links -> /posts/<slug>/
    .replace(/\{\{\s*'\/([^']+?)\/?'\s*\|\s*relative_url\s*\}\}/g, '/posts/$1/')
    // ../assets/images -> /assets/images
    .replace(/(["(])\.\.\/assets\//g, '$1/assets/')
    .replace(/\n{4,}/g, '\n\n\n');
}

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) {
    console.error(`sem front matter: ${file}`);
    continue;
  }
  const fm = Object.fromEntries(
    m[1].split('\n')
      .map((line) => line.match(/^(\w+):\s*(.*)$/))
      .filter(Boolean)
      .map(([, k, v]) => [k, v.trim()]),
  );

  const name = basename(file, '.md');
  const fileDate = name.slice(0, 10);
  // Datas 2019-08-08 são placeholders do template Chirpy; usa a data do arquivo.
  const date = fm.date && !fm.date.startsWith('2019-') ? fm.date.slice(0, 10) : fileDate;
  const cover = fm.image ? '/' + fm.image.replace(/^\//, '') : undefined;

  const out = [
    '---',
    `title: ${JSON.stringify(unquote(fm.title ?? name))}`,
    `description: ${JSON.stringify(unquote(fm.description ?? ''))}`,
    `date: ${date}`,
    `author: ${fm.author || 'rafael'}`,
    `categories: ${JSON.stringify(parseList(fm.categories ?? ''))}`,
    `tags: ${JSON.stringify(parseList(fm.tags ?? ''))}`,
    cover ? `cover: ${JSON.stringify(cover)}` : null,
    fm.pin === 'true' ? 'featured: true' : null,
    forceDraft ? 'draft: true' : null,
    '---',
    '',
  ].filter((l) => l !== null).join('\n');

  const target = join(OUT_DIR, `${name}.md`);
  writeFileSync(target, out + convertBody(m[2]).trimStart());
  console.log(`ok  ${file} -> ${target}`);
}
