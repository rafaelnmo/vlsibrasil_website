// Configuração central do site. Quase tudo que você precisa mudar está aqui.

export const SITE = {
  title: 'VLSI Brasil',
  tagline: 'Desvendando o projeto de circuitos integrados no Brasil',
  description:
    'Tutoriais e artigos em português sobre projeto de circuitos integrados, fluxo digital, ferramentas de EDA e a indústria de semicondutores.',
  url: 'https://vlsibrasil.com.br',
  lang: 'pt-BR',
  email: 'vlsibrasil@gmail.com',
  ogImage: '/assets/images/favicon_io/android-chrome-512x512.png',
};

export const SOCIAL = [
  { name: 'Instagram', url: 'https://www.instagram.com/vlsibrasil' },
  { name: 'GitHub', url: 'https://github.com/vlsibrasil' },
  { name: 'X', url: 'https://twitter.com/vlsibrasil' },
  { name: 'Facebook', url: 'https://www.facebook.com/vlsibrasil' },
];

export const AUTHORS: Record<string, { name: string; url?: string; avatar?: string }> = {
  rafael: {
    name: 'Rafael Oliveira',
    url: 'https://rafaelnmo.github.io/',
    avatar: '/assets/images/authors/rafael_1.jpg',
  },
};

export const NAV = [
  { label: 'Artigos', href: '/posts/' },
  { label: 'Categorias', href: '/categories/' },
  { label: 'Sobre', href: '/about/' },
  { label: 'Anuncie', href: '/anuncie/' },
];

// ---------------------------------------------------------------------------
// Anúncios
//
// Cada <AdSlot slot="..."> do site escolhe o que mostrar nesta ordem:
//   1. um patrocinador direto em `sponsors` para aquele slot;
//   2. Google AdSense, se `adsense.enabled` e o slot tiver um ID;
//   3. um bloco "Anuncie aqui" levando para /anuncie (se `houseAds`).
// ---------------------------------------------------------------------------

export type AdSlotName = 'home-banner' | 'post-sidebar' | 'post-end' | 'list-inline';

export const ADS = {
  adsense: {
    enabled: false, // mude para true depois que o AdSense aprovar o site
    client: 'ca-pub-5534092442005229',
    slots: {
      'home-banner': '2298956700',
      'post-sidebar': '2298956700',
      'post-end': '2414506773',
      'list-inline': '2298956700',
    } as Partial<Record<AdSlotName, string>>,
  },
  houseAds: true,
  // Exemplo de patrocinador direto:
  // 'post-sidebar': {
  //   name: 'Empresa X',
  //   url: 'https://empresax.com.br/?utm_source=vlsibrasil',
  //   image: '/assets/sponsors/empresax-300x250.png',
  //   text: 'Vagas abertas para engenheiros de verificação',
  // },
  sponsors: {} as Partial<
    Record<AdSlotName, { name: string; url: string; image?: string; text?: string }>
  >,
};
