import { Metadata } from "next";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/db/connect";
import Product from "@/lib/db/models/Product";
import ProductDetailClient from "@/components/products/ProductDetailClient";
import ProductStructuredData from "@/components/products/ProductStructuredData";

interface Props {
    params: { slug: string };
}

async function getProduct(slug: string) {
    await dbConnect();
    const product = await Product.findOne({ slug, isActive: true }).lean();
    if (!product) return null;

    // Transform stock number to object expected by client component
    const serialized = JSON.parse(JSON.stringify(product));
    return {
        ...serialized,
        stock: {
            available: serialized.stock || 0,
            isLowStock: (serialized.stock || 0) <= 10
        }
    };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const product = await getProduct(params.slug);
    if (!product) return { title: "Product Not Found" };

    return {
        title: product.name,
        description: product.description.substring(0, 160),
        openGraph: {
            title: product.name,
            description: product.description.substring(0, 160),
            images: product.images[0] ? [{ url: product.images[0] }] : [],
            type: "article",
        },
    };
}

export default async function ProductDetailPage({ params }: Props) {
    const product = await getProduct(params.slug);

    if (!product) {
        notFound();
    }

    return (
        <>
            <ProductStructuredData product={product} />
            <ProductDetailClient product={product} />
        </>
    );
}
