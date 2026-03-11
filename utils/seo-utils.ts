// 🔍 SEO Utilities for SINGGLEBEE

export function generateTitle(path: string): string {
  const titles: Record<string, string> = {
    '/': 'SINGGLEBEE | Premium Tamil Educational Books & Rhymes for Kids',
    '/products': 'Educational Products | SINGGLEBEE',
    '/products/books': 'Tamil Books for Kids | SINGGLEBEE',
    '/products/poems': 'Tamil Poems & Rhymes | SINGGLEBEE',
    '/products/stories': 'Children Stories | SINGGLEBEE',
    '/about': 'About SINGGLEBEE | Premium Educational Content',
    '/contact': 'Contact SINGGLEBEE | Get in Touch',
    '/cart': 'Shopping Cart | SINGGLEBEE',
    '/login': 'Login | SINGGLEBEE',
    '/register': 'Register | SINGGLEBEE',
  };

  return titles[path] || 'SINGGLEBEE | Premium Educational Marketplace';
}

export function generateDescription(path: string): string {
  const descriptions: Record<string, string> = {
    '/': 'Discover premium Tamil educational books, rhymes, and learning materials for children at SINGGLEBEE. Shop our curated collection of educational content.',
    '/products':
      'Browse our complete collection of Tamil educational products including books, poems, stories, and learning materials for kids.',
    '/products/books':
      'Shop premium Tamil educational books designed to make learning fun and engaging for children of all ages.',
    '/products/poems':
      'Explore beautiful Tamil poems and rhymes that help children develop language skills and cultural appreciation.',
    '/products/stories':
      'Discover engaging Tamil stories that entertain and educate children with valuable life lessons and cultural heritage.',
    '/about':
      "Learn about SINGGLEBEE's mission to provide high-quality Tamil educational content that makes learning enjoyable for children.",
    '/contact':
      "Get in touch with SINGGLEBEE for questions, support, or partnership opportunities. We're here to help with your educational needs.",
    '/cart':
      'Review your shopping cart and complete your purchase of premium Tamil educational materials from SINGGLEBEE.',
    '/login':
      'Access your SINGGLEBEE account to track orders, save favorites, and enjoy a personalized shopping experience.',
    '/register':
      'Create your SINGGLEBEE account to get exclusive offers, track orders, and enjoy personalized recommendations.',
  };

  return (
    descriptions[path] ||
    'SINGGLEBEE offers premium Tamil educational books, rhymes, and learning materials for children.'
  );
}

export function generateKeywords(path: string): string {
  const keywords: Record<string, string> = {
    '/': 'Tamil books, educational books, children books, rhymes, poems, stories, learning materials, singglebee, Tamil education',
    '/products':
      'Tamil educational products, kids learning, Tamil books, educational materials, children education, singglebee',
    '/products/books':
      'Tamil books for kids, children books, educational books, Tamil learning, kids books, singglebee books',
    '/products/poems':
      'Tamil poems, children rhymes, Tamil rhymes, kids poems, educational poems, singglebee poems',
    '/products/stories':
      'Tamil stories, children stories, educational stories, kids stories, Tamil literature, singglebee stories',
    '/about':
      'SINGGLEBEE, Tamil education, educational mission, about singglebee, educational content, children learning',
    '/contact':
      'SINGGLEBEE contact, customer support, educational help, Tamil books support, singglebee help',
    '/cart':
      'shopping cart, buy Tamil books, educational books purchase, singglebee cart, checkout',
    '/login':
      'SINGGLEBEE login, account access, Tamil books account, educational login, singglebee sign in',
    '/register':
      'SINGGLEBEE register, create account, Tamil books registration, educational signup, singglebee account',
  };

  return (
    keywords[path] || 'Tamil educational books, children learning, singglebee, educational content'
  );
}

export function generateStructuredData(path: string): string {
  const structuredData: Record<string, object> = {
    '/': {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'SINGGLEBEE',
      url: 'https://singglebee.com',
      description: 'Premium Tamil educational books, rhymes, and learning materials for children',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://singglebee.com/search?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
    '/products': {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Educational Products',
      description: 'Browse our collection of Tamil educational products',
      url: 'https://singglebee.com/products',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: 100,
        itemListElement: [
          {
            '@type': 'Product',
            name: 'Tamil Educational Books',
            description: 'Premium Tamil books for children',
          },
        ],
      },
    },
    '/about': {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'SINGGLEBEE',
      url: 'https://singglebee.com',
      description: 'Premium Tamil educational content provider',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: ['Tamil', 'English'],
      },
    },
  };

  return structuredData[path]
    ? `<meta name="structured-data" content="${JSON.stringify(structuredData[path])}">`
    : '';
}

export function generateJSONLD(path: string): string {
  const jsonLD: Record<string, object> = {
    '/': {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'SINGGLEBEE',
      url: 'https://singglebee.com',
      description: 'Premium Tamil educational books, rhymes, and learning materials for children',
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://singglebee.com/search?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
    '/products': {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Educational Products',
      description: 'Browse our collection of Tamil educational products',
      url: 'https://singglebee.com/products',
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: 100,
        itemListElement: [
          {
            '@type': 'Product',
            name: 'Tamil Educational Books',
            description: 'Premium Tamil books for children',
          },
        ],
      },
    },
    '/about': {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'SINGGLEBEE',
      url: 'https://singglebee.com',
      description: 'Premium Tamil educational content provider',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: ['Tamil', 'English'],
      },
    },
  };

  return JSON.stringify(jsonLD[path] || {});
}

export function generateProductSchema(product: any): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.image,
    brand: {
      '@type': 'Brand',
      name: 'SINGGLEBEE',
    },
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'INR',
      availability:
        product.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    },
    aggregateRating: product.rating
      ? {
          '@type': 'AggregateRating',
          ratingValue: product.rating,
          reviewCount: product.reviewCount || 1,
        }
      : undefined,
  });
}

export function generateBreadcrumbSchema(path: string): string {
  const pathSegments = path.split('/').filter(Boolean);
  const breadcrumbs = [{ name: 'Home', url: 'https://singglebee.com' }];

  let currentPath = 'https://singglebee.com';
  pathSegments.forEach((segment) => {
    currentPath += `/${segment}`;
    breadcrumbs.push({
      name: segment.charAt(0).toUpperCase() + segment.slice(1),
      url: currentPath,
    });
  });

  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  });
}

export function generateRobotsTxt(): string {
  return `User-agent: *
Allow: /

# Sitemap
Sitemap: https://singglebee.com/sitemap.xml

# Block admin areas
Disallow: /admin/
Disallow: /api/
Disallow: /checkout/
Disallow: /profile/

# Allow specific bots
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

# Crawl delay
Crawl-delay: 1`;
}

export function generateSitemapXml(): string {
  const pages = [
    { loc: 'https://singglebee.com', priority: '1.0', changefreq: 'daily' },
    { loc: 'https://singglebee.com/products', priority: '0.9', changefreq: 'daily' },
    { loc: 'https://singglebee.com/products/books', priority: '0.8', changefreq: 'weekly' },
    { loc: 'https://singglebee.com/products/poems', priority: '0.8', changefreq: 'weekly' },
    { loc: 'https://singglebee.com/products/stories', priority: '0.8', changefreq: 'weekly' },
    { loc: 'https://singglebee.com/about', priority: '0.7', changefreq: 'monthly' },
    { loc: 'https://singglebee.com/contact', priority: '0.6', changefreq: 'monthly' },
    { loc: 'https://singglebee.com/cart', priority: '0.5', changefreq: 'monthly' },
    { loc: 'https://singglebee.com/login', priority: '0.4', changefreq: 'monthly' },
    { loc: 'https://singglebee.com/register', priority: '0.4', changefreq: 'monthly' },
  ];

  const xmlPages = pages
    .map(
      (page) => `
  <url>
    <loc>${page.loc}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <priority>${page.priority}</priority>
    <changefreq>${page.changefreq}</changefreq>
  </url>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlPages}
</urlset>`;
}
