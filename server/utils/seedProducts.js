/**
 * Product seeding utility
 * Seeds the existing mock products into MongoDB
 * Run with: npm run seed:products
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import connectDB from '../config/db.js';
import logger from './logger.js';

// Mock products data (from existing frontend constants.ts)
const SEED_PRODUCTS = [
  {
    name: 'தமிழ் பாலபாடம் - 1',
    title: 'தமிழ் பாலபாடம் - 1',
    author: 'SINGGLEBEE',
    price: 199,
    rating: 4.8,
    reviewCount: 12,
    category: 'Books',
    description:
      'Tamil Balapaadam – 1 (மோராவின் பாலபாடம்) introduces children to Tamil letters, words, pictures, and rhymes, building early reading and writing skills. This comprehensive primer is designed to make learning Tamil fun and engaging for young minds through colorful illustrations and clear phonetic guides. It features curated sections on Birds (பறவைகள்), Insects (பூச்சிகள்), Sea Animals, and detailed classifications of Wild and Domestic animals.',
    bestseller: true,
    pages: 32,
    language: 'Tamil',
    format: 'Paperback',
    stockQuantity: 50,
    status: 'active',
    reviews: [
      {
        userName: 'Karthik Raja',
        rating: 5,
        comment: 'The bird pictures are very realistic. My child learned the Tamil names in a day!',
        date: new Date('2025-08-15'),
      },
      {
        userName: 'Priyadharshini',
        rating: 4,
        comment:
          "Excellent quality paper. The phonetic guide is very helpful for parents who aren't fluent.",
        date: new Date('2025-09-22'),
      },
    ],
  },
  {
    name: 'தமிழ் பாலபாடம் - 2',
    title: 'தமிழ் பாலபாடம் - 2',
    author: 'SINGGLEBEE',
    price: 199,
    rating: 4.9,
    reviewCount: 27,
    category: 'Books',
    description:
      'Tamil Balapaadam – 2 (மோராவின் பாலபாடம்) takes the learning journey further for Level 2 students. This volume introduces advanced categories including Vehicles (ஊர்திகள்), Musical Instruments (இசைக் கருவிகள்), and Play Equipment. Children will explore Body Parts, Action Words (வினைச் சொற்கள்), and physical wellness through Exercises like Side Stretching. It also covers essential cultural knowledge such as State and National Symbols, Daily Habits, and Tastes (சுவைகள்) like Astringent (துவர்ப்பு).',
    bestseller: false,
    pages: 40,
    language: 'Tamil',
    format: 'Paperback',
    stockQuantity: 40,
    status: 'active',
    reviews: [
      {
        userName: 'Muthu Kumaran',
        rating: 5,
        comment:
          'Level 2 is even better! The sections on vehicles and cultural symbols are very informative.',
        date: new Date('2025-10-10'),
      },
      {
        userName: 'Kavitha Selvam',
        rating: 5,
        comment:
          'Our family loves the national symbols section. Great way to teach heritage to kids.',
        date: new Date('2025-11-05'),
      },
    ],
  },
  {
    name: 'தமிழ் அரிச்சுவடி - 1',
    title: 'தமிழ் அரிச்சுவடி - 1',
    author: 'SINGGLEBEE',
    price: 179,
    rating: 4.7,
    reviewCount: 43,
    category: 'Books',
    description:
      'Tamil Arichuvadi – 1 is a beginner learning book for children that teaches Tamil letters, words, pictures, and rhymes in a simple, fun way. It focuses on foundational literacy, helping young learners recognize vowels and consonants through engaging visual associations. This Arichuvadi is the perfect first step for kids starting their Tamil educational journey at the hive.',
    bestseller: true,
    pages: 28,
    language: 'Tamil',
    format: 'Paperback',
    stockQuantity: 60,
    status: 'active',
    reviews: [
      {
        userName: 'Rajesh Kannan',
        rating: 4,
        comment:
          'Simple and effective. The association between letters and pictures is perfect for 3-year-olds.',
        date: new Date('2025-08-28'),
      },
      {
        userName: 'Meena Kumari',
        rating: 5,
        comment: "This is the best Arichuvadi I've found. Very clean design and not cluttered.",
        date: new Date('2025-12-12'),
      },
    ],
  },
  {
    name: 'தமிழ் அரிச்சுவடி - 2',
    title: 'தமிழ் அரிச்சுவடி - 2',
    author: 'SINGGLEBEE',
    price: 179,
    rating: 4.9,
    reviewCount: 34,
    category: 'Books',
    description:
      'Tamil Arichuvadi – 2 is a beginner-level book for kids that introduces Tamil letters, simple words, pictures, and rhymes to build strong early literacy skills.',
    bestseller: false,
    pages: 32,
    language: 'Tamil',
    format: 'Paperback',
    stockQuantity: 45,
    status: 'active',
    reviews: [
      {
        userName: 'Vijay Sethupathi',
        rating: 5,
        comment:
          'Level 2 builds perfectly on the first book. My daughter loves the rhymes at the end.',
        date: new Date('2025-09-09'),
      },
      {
        userName: 'Lakshmi Narayanan',
        rating: 5,
        comment: 'High quality printing and very engaging. Worth every rupee for early learners.',
        date: new Date('2026-01-03'),
      },
    ],
  },
  {
    name: 'பட்டம் பறக்கும் பட்டம் - 1',
    title: 'பட்டம் பறக்கும் பட்டம் - 1',
    author: 'SINGGLEBEE',
    price: 259,
    rating: 4.9,
    reviewCount: 127,
    category: 'Poem Book',
    description:
      'Pattam Parakkum Pattam – 1 (Tamil Poem Book) is a joyful poetry collection for children, filled with simple, rhythmic Tamil poems that spark imagination, language skills, and a love for reading.',
    bestseller: true,
    pages: 48,
    language: 'Tamil',
    format: 'Paperback',
    stockQuantity: 35,
    status: 'active',
    reviews: [
      {
        userName: 'Sangeetha Mani',
        rating: 5,
        comment: 'The poems are so rhythmic! I catch my son humming them all day. Truly joyful.',
        date: new Date('2025-10-22'),
      },
      {
        userName: 'Dinesh Babu',
        rating: 5,
        comment:
          'Beautiful Tamil poetry for kids. It really sparks their imagination and love for the language.',
        date: new Date('2025-12-30'),
      },
    ],
  },
  {
    name: 'பட்டம் பறக்கும் பட்டம் - 2',
    title: 'பட்டம் பறக்கும் பட்டம் - 2',
    author: 'SINGGLEBEE',
    price: 259,
    rating: 4.8,
    reviewCount: 118,
    category: 'Poem Book',
    description:
      'Pattam Parakkum Pattam – 2 (Tamil Poem Book) is currently buzzing out of stock. Stay tuned for its return!',
    bestseller: true,
    isOutOfStock: true,
    pages: 48,
    language: 'Tamil',
    format: 'Paperback',
    stockQuantity: 5,
    status: 'active',
    reviews: [
      {
        userName: 'Arulmozhi Varman',
        rating: 4,
        comment: 'Waiting for this to restock! My first child loved the Level 1 book so much.',
        date: new Date('2025-11-15'),
      },
      {
        userName: 'Yazhini Devi',
        rating: 5,
        comment:
          'The illustrations in Pattam series are world-class. Hope it comes back to the hive soon!',
        date: new Date('2026-01-10'),
      },
    ],
  },
  {
    name: 'Kite Flies High - 1',
    title: 'Kite Flies High - 1',
    author: 'SINGGLEBEE',
    price: 259,
    rating: 4.9,
    reviewCount: 213,
    category: 'Poem Book',
    description:
      'Kite Flies High – 1 (English Poem Book) is a joyful poetry collection for children, filled with simple, rhythmic English poems that spark imagination, language skills, and a love for reading.',
    bestseller: true,
    pages: 48,
    language: 'English',
    format: 'Paperback',
    stockQuantity: 55,
    status: 'active',
    reviews: [
      {
        userName: 'Kavin Thangavel',
        rating: 5,
        comment:
          'A delightful English version. The transition from Tamil to English poems is very smooth.',
        date: new Date('2025-08-19'),
      },
      {
        userName: 'Mathi Maran',
        rating: 5,
        comment:
          'My kids enjoy the English rhymes just as much as the Tamil ones. Very well written!',
        date: new Date('2025-10-05'),
      },
    ],
  },
  {
    name: 'Kite Flies High - 2',
    title: 'Kite Flies High - 2',
    author: 'SINGGLEBEE',
    price: 259,
    rating: 4.8,
    reviewCount: 187,
    category: 'Poem Book',
    description:
      'Kite Flies High – 2 (English Poem Book) is currently buzzing out of stock. Stay tuned for its return!',
    bestseller: false,
    isOutOfStock: true,
    pages: 48,
    language: 'English',
    format: 'Paperback',
    stockQuantity: 8,
    status: 'active',
    reviews: [
      {
        userName: 'Iniyan Selvan',
        rating: 4,
        comment: 'Great collection of English poems for toddlers. Simple language and cute themes.',
        date: new Date('2025-11-30'),
      },
      {
        userName: 'Thamizhalagan',
        rating: 5,
        comment: 'Every child should have this. It makes learning English poetry so much fun!',
        date: new Date('2025-12-18'),
      },
    ],
  },
  {
    name: 'Tales of Goodness',
    title: 'Tales of Goodness',
    author: 'SINGGLEBEE',
    price: 359,
    rating: 4.9,
    reviewCount: 78,
    category: 'Story Book',
    description:
      "Tales of Goodness – Story Book is a heartwarming collection of children's stories that teach kindness, values, and life lessons through simple, engaging narratives.",
    bestseller: false,
    pages: 64,
    language: 'English',
    format: 'Paperback',
    stockQuantity: 30,
    status: 'active',
    reviews: [
      {
        userName: 'Malar Vizhi',
        rating: 5,
        comment:
          'The stories are so heartwarming. They really teach good values without being preachy.',
        date: new Date('2025-09-28'),
      },
      {
        userName: 'Shenbagam',
        rating: 5,
        comment: 'Perfect bedtime stories. My daughter asks for one every single night!',
        date: new Date('2026-01-12'),
      },
    ],
  },
  {
    name: 'Three Tiny Tales for Twilight Time',
    title: 'Three Tiny Tales for Twilight Time',
    author: 'SINGGLEBEE',
    price: 359,
    rating: 4.8,
    reviewCount: 61,
    category: 'Story Book',
    description:
      'Three Tiny Tales for Twilight Time – Story Book is a gentle collection of short bedtime stories that calm young minds, spark imagination, and nurture a love for reading before sleep.',
    bestseller: true,
    pages: 56,
    language: 'English',
    format: 'Paperback',
    stockQuantity: 25,
    status: 'active',
    reviews: [
      {
        userName: 'Ilango Adigal',
        rating: 5,
        comment:
          'Gentle and calming stories. The Twilight theme is perfect for winding down the day.',
        date: new Date('2025-12-05'),
      },
      {
        userName: 'Kannagi Selvi',
        rating: 5,
        comment:
          'The three tales are just the right length for a quick yet satisfying bedtime read.',
        date: new Date('2026-01-15'),
      },
    ],
  },
];

const seedProducts = async () => {
  try {
    await connectDB();

    // Check if products already exist
    const existingCount = await Product.countDocuments();

    if (process.env.NODE_ENV === 'production' && existingCount > 0) {
      logger.info(
        `Production environment detected. Skipping product stock reset.`
      );
      return;
    }

    if (existingCount > 0) {
      logger.info(
        `Database already has ${existingCount} products. Updating stock for existing products.`
      );

      for (const seedProd of SEED_PRODUCTS) {
        await Product.findOneAndUpdate(
          { $or: [{ title: seedProd.title }, { name: seedProd.name }] },
          { $set: { stockQuantity: seedProd.stockQuantity, status: 'active', isOutOfStock: false } }
        );
      }
      logger.info('Stock update complete.');
      return;
    }

    // Force refresh indexes to apply language_override fix
    try {
      await Product.collection.dropIndexes();
      logger.info('Dropped old product indexes');
    } catch (e) {
      logger.debug('No existing indexes to drop');
    }

    // Insert products
    const products = await Product.insertMany(SEED_PRODUCTS);

    logger.info(`✅ Successfully seeded ${products.length} products`);

    // Log product summary
    products.forEach((p) => {
      logger.info(`  - ${p.title} - ₹${p.price} - Stock: ${p.stockQuantity}`);
    });
  } catch (error) {
    logger.error(`Seed failed: ${error.message}`);
  }
};

// If running directly (node seedProducts.js), execute it
if (process.argv[1] === import.meta.filename) {
  seedProducts().then(() => {
    console.log('Seeding complete');
    process.exit(0);
  });
}

export default seedProducts;
