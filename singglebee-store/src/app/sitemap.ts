import { MetadataRoute } from 'next'
import dbConnect from '@/lib/db/connect'
import Product from '@/lib/db/models/Product'
import { IProduct } from '@/types'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://singglebee.com'

    // Fetch all product slugs for dynamic routes
    let productRoutes: MetadataRoute.Sitemap = []
    try {
        await dbConnect()
        const products = await Product.find({ isActive: true }).select('slug updatedAt').lean();

        productRoutes = (products as Pick<IProduct, 'slug' | 'updatedAt'>[]).map((product) => ({
            url: `${baseUrl}/products/${product.slug}`,
            lastModified: product.updatedAt || new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        }))
    } catch (error) {
        console.error('Sitemap product fetch error:', error)
    }

    const staticRoutes: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 1,
        },
        {
            url: `${baseUrl}/products`,
            lastModified: new Date(),
            changeFrequency: 'daily' as const,
            priority: 0.8,
        },
        {
            url: `${baseUrl}/cart`,
            lastModified: new Date(),
            changeFrequency: 'monthly' as const,
            priority: 0.3,
        },
    ]

    return [...staticRoutes, ...productRoutes]
}
