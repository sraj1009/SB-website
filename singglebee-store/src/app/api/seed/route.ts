import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Product from "@/lib/db/models/Product";
import Stock from "@/lib/db/models/Stock";

const SEED_PRODUCTS = [
    {
        name: "தமிழ் பாலபாடம் - 1",
        description: "Tamil Balapaadam – 1 (மோராவின் பாலபாடம்) introduces children to Tamil letters, words, pictures, and rhymes, building early reading and writing skills. This comprehensive primer is designed to make learning Tamil fun and engaging for young minds through colorful illustrations and clear phonetic guides. It features curated sections on Birds (பறவைகள்), Insects (பூச்சிகள்), Sea Animals, and detailed classifications of Wild and Domestic animals.",
        price: 19900,
        category: "Books",
        images: ["/assets/product-1.png"],
        sku: "SB-BKS-001",
        stock: 50,
        language: "Tamil"
    },
    {
        name: "தமிழ் பாலபாடம் - 2",
        description: "Tamil Balapaadam – 2 (மோராவின் பாலபாடம்) takes the learning journey further for Level 2 students. This volume introduces advanced categories including Vehicles (ஊர்திகள்), Musical Instruments (இசைக் கருவிகள்), and Play Equipment. Children will explore Body Parts, Action Words (வினைச் சொற்கள்), and physical wellness through Exercises like Side Stretching. It also covers essential cultural knowledge such as State and National Symbols, Daily Habits, and Tastes (சுவைகள்) like Astringent (துவர்ப்பு).",
        price: 19900,
        category: "Books",
        images: ["/assets/product-2.png"],
        sku: "SB-BKS-002",
        stock: 40,
        language: "Tamil"
    },
    {
        name: "தமிழ் அரிச்சுவடி - 1",
        description: "Tamil Arichuvadi – 1 is a beginner learning book for children that teaches Tamil letters, words, pictures, and rhymes in a simple, fun way. It focuses on foundational literacy, helping young learners recognize vowels and consonants through engaging visual associations. This Arichuvadi is the perfect first step for kids starting their Tamil educational journey at the hive.",
        price: 17900,
        category: "Books",
        images: ["/assets/product-3.jpg"],
        sku: "SB-BKS-003",
        stock: 60,
        language: "Tamil"
    },
    {
        name: "தமிழ் அரிச்சுவடி - 2",
        description: "Tamil Arichuvadi – 2 is a beginner-level book for kids that introduces Tamil letters, simple words, pictures, and rhymes to build strong early literacy skills.",
        price: 17900,
        category: "Books",
        images: ["/assets/product-4.png"],
        sku: "SB-BKS-004",
        stock: 45,
        language: "Tamil"
    },
    {
        name: "பட்டம் பறக்கும் பட்டம் - 1",
        description: "Pattam Parakkum Pattam – 1 (Tamil Poem Book) is a joyful poetry collection for children, filled with simple, rhythmic Tamil poems that spark imagination, language skills, and a love for reading.",
        price: 25900,
        category: "Poem Book",
        images: ["/assets/product-5.jpg"],
        sku: "SB-POM-001",
        stock: 35,
        language: "Tamil"
    },
    {
        name: "பட்டம் பறக்கும் பட்டம் - 2",
        description: "Pattam Parakkum Pattam – 2 (Tamil Poem Book) is currently buzzing out of stock. Stay tuned for its return!",
        price: 25900,
        category: "Poem Book",
        images: ["/assets/product-6.jpg"],
        sku: "SB-POM-002",
        stock: 0,
        language: "Tamil"
    },
    {
        name: "Kite Flies High - 1",
        description: "Kite Flies High – 1 (English Poem Book) is a joyful poetry collection for children, filled with simple, rhythmic English poems that spark imagination, language skills, and a love for reading.",
        price: 25900,
        category: "Poem Book",
        images: ["/assets/product-7.jpg"],
        sku: "SB-POM-003",
        stock: 55,
        language: "English"
    },
    {
        name: "Kite Flies High - 2",
        description: "Kite Flies High – 2 (English Poem Book) is currently buzzing out of stock. Stay tuned for its return!",
        price: 25900,
        category: "Poem Book",
        images: ["/assets/out-of-stock.png"],
        sku: "SB-POM-004",
        stock: 0,
        language: "English"
    },
    {
        name: "Tales of Goodness",
        description: "Tales of Goodness – Story Book is a heartwarming collection of children's stories that teach kindness, values, and life lessons through simple, engaging narratives.",
        price: 35900,
        category: "Story Book",
        images: ["/assets/product-9.jpg"],
        sku: "SB-STR-001",
        stock: 30,
        language: "English"
    },
    {
        name: "Three Tiny Tales for Twilight Time",
        description: "Three Tiny Tales for Twilight Time – Story Book is a gentle collection of short bedtime stories that calm young minds, spark imagination, and nurture a love for reading before sleep.",
        price: 35900,
        category: "Story Book",
        images: ["/assets/product-10.jpg"],
        sku: "SB-STR-002",
        stock: 25,
        language: "English"
    }
];

export async function GET() {
    try {
        await dbConnect();

        // 1. Clear existing products and stocks
        const deletedProducts = await Product.deleteMany({});
        const deletedStocks = await Stock.deleteMany({});
        console.log(`Deleted ${deletedProducts.deletedCount} products and ${deletedStocks.deletedCount} stocks`);

        for (const p of SEED_PRODUCTS) {
            console.log(`Creating product: ${p.name} (${p.sku})`);

            // 2. Create Product instance and save (ensures hooks)
            const product = new Product({
                name: p.name,
                description: p.description,
                price: p.price,
                category: p.category,
                images: p.images,
                sku: p.sku.toUpperCase(),
                language: (p as any).language,
                isActive: true
            });
            await product.save();

            // 3. Create Stock
            await Stock.create({
                product: product._id,
                quantity: p.stock,
                reservedQuantity: 0,
                lowStockThreshold: 5
            });
        }

        return NextResponse.json({ success: true, message: "Successfully seeded 10 products" });
    } catch (error: any) {
        console.error("Seed error:", error);
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack,
            details: error
        }, { status: 500 });
    }
}
