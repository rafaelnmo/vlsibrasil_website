import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

// Rascunhos aparecem no `npm run dev`, mas nunca no site publicado.
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft);
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function readingTime(body = ''): number {
  const words = body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Usa a descrição do front matter ou, se vazia, o primeiro parágrafo do texto.
export function excerpt(post: Post, max = 180): string {
  if (post.data.description) return post.data.description;
  const para = (post.body ?? '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>/g, '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !/^(#|!\[|\||-|\*|>)/.test(p));
  const text = (para ?? '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`]/g, '');
  return text.length > max ? text.slice(0, max).replace(/\s+\S*$/, '') + '…' : text;
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

// Cada categoria ganha a cor de uma "camada" de layout, sempre a mesma.
const LAYERS = ['m1', 'm2', 'm3', 'poly', 'diff', 'via'] as const;
export function layerOf(category: string): string {
  let h = 0;
  for (const c of slugify(category)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return LAYERS[h % LAYERS.length];
}

export function groupBy(posts: Post[], key: 'categories' | 'tags') {
  const map = new Map<string, { name: string; posts: Post[] }>();
  for (const post of posts) {
    // Para categorias, só a principal (primeira) agrupa — como no Chirpy.
    const values = key === 'categories' ? post.data.categories.slice(0, 1) : post.data.tags;
    for (const name of values) {
      const slug = slugify(name);
      if (!map.has(slug)) map.set(slug, { name, posts: [] });
      map.get(slug)!.posts.push(post);
    }
  }
  return [...map.entries()]
    .map(([slug, v]) => ({ slug, ...v }))
    .sort((a, b) => b.posts.length - a.posts.length || a.name.localeCompare(b.name));
}

export function relatedPosts(post: Post, all: Post[], n = 3): Post[] {
  const tags = new Set([...post.data.tags, ...post.data.categories].map(slugify));
  return all
    .filter((p) => p.id !== post.id)
    .map((p) => ({
      p,
      score: [...p.data.tags, ...p.data.categories].filter((t) => tags.has(slugify(t))).length,
    }))
    .sort((a, b) => b.score - a.score || b.p.data.date.getTime() - a.p.data.date.getTime())
    .slice(0, n)
    .map(({ p }) => p);
}
