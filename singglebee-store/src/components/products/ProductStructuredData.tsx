interface StructuredProduct {
    name: string;
    images: string[];
    description: string;
    sku: string;
    slug: string;
    price: number;
    stock?: { available: number };
}

export default function ProductStructuredData({ product }: { product: StructuredProduct }) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://singglebee.com'

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.name,
        image: product.images,
        description: product.description,
        sku: product.sku,
        brand: {
            '@type': 'Brand',
            name: 'SinggleBee',
        },
        offers: {
            '@type': 'Offer',
            url: `${baseUrl}/products/${product.slug}`,
            priceCurrency: 'INR',
            price: (product.price / 100).toFixed(2),
            availability: (product.stock?.available ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            seller: {
                '@type': 'Organization',
                name: 'SinggleBee',
            },
        },
    }

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    )
}
