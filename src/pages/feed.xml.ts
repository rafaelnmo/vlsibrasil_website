import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../config';
import { excerpt, getPosts } from '../lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: SITE.title,
    description: SITE.description,
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: excerpt(post),
      pubDate: post.data.date,
      link: `/posts/${post.id}/`,
      categories: post.data.categories,
    })),
    customData: '<language>pt-BR</language>',
  });
}
