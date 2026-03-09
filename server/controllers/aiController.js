import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';

/**
 * @desc    Chat with Hive Assistant
 * @route   POST /api/v1/assistant/chat
 * @access  Public
 */
export const chatWithHive = async (req, res, next) => {
  try {
    const { query, products } = req.body;

    if (!query) {
      return res.status(400).json({ success: false, message: 'Query is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing in server environment');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Limit product context to save tokens and avoid payload issues
    const productContext = (products || [])
      .slice(0, 50)
      .map(
        (p) =>
          `- ${p.title} by ${p.author} (₹${p.price}, ${p.category}): ${p.description ? p.description.substring(0, 100) : ''}...${p.bestseller ? ' [BESTSELLER]' : ''}${p.isOutOfStock ? ' [OUT OF STOCK]' : ''}`
      )
      .join('\n');

    const prompt = `You are "Bernie the Bee," the wise and helpful chief librarian of SINGGLEBEE's Hive. 
        
        YOUR PERSONALITY:
        - Enthusiastic, knowledgeable, and slightly playful.
        - Sprinkle in bee-themed vocabulary (hive, honey, buzzing, nectar, sweet deals) occasionally, but keep it professional enough for clear communication.
        - You treat the books like precious nectar.
        
        YOUR KNOWLEDGE BASE:
        - Online Store: SINGGLEBEE (Books, Gourmet Treats, Stationery).
        - Shipping: Fast delivery across Tamil Nadu (3-5 days).
        - Inventory Sample:
        ${productContext}
        
        INSTRUCTIONS:
        1. If a user asks for a recommendation, pick a specific book and explain its "flavor" (why it's good).
        2. If a product is [OUT OF STOCK], let them know gently and suggest a "sweet" alternative.
        3. If you don't know something, don't make it up! Suggest checking our latest arrivals or categories.
        4. Provide concise, helpful responses.
        5. User Question: "${query}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      data: text,
    });
  } catch (error) {
    logger.warn(`Gemini API failed, using local assistant: ${error.message}`);

    // --- BUILT-IN LOCAL ASSISTANT FALLBACK ---
    try {
      const { query, products } = req.body;
      const q = query.toLowerCase();
      let responseText = '';

      // Smart Intent Detection
      if (q.includes('best') || q.includes('popular') || q.includes('top')) {
        const best = (products || []).filter((p) => p.bestseller)[0];
        responseText = best
          ? `Buzz! Our most popular nectar right now is **${best.title}**. It's a real hive favorite! 🍯`
          : 'The hive is split! All our books are buzzing with popularity. Our Tamil Balapaadam series is always a hit!';
      } else if (
        q.includes('cheap') ||
        q.includes('price') ||
        q.includes('cost') ||
        q.includes('afford')
      ) {
        const cheap = [...(products || [])].sort((a, b) => a.price - b.price)[0];
        responseText = cheap
          ? `Looking for a sweet deal? **${cheap.title}** is only ₹${cheap.price}! Pure nectar for your wallet. 🐝`
          : 'We have sweet deals starting from ₹179! Check out our Arichuvadi series.';
      } else if (q.includes('tamil')) {
        responseText =
          "I'm buzzing with pride about our Tamil collection! We have everything from Balapaadam to rhythmic poem books. Which Level are you looking for? 📖";
      } else if (q.includes('delivery') || q.includes('ship') || q.includes('track')) {
        responseText =
          'Our bees deliver all across Tamil Nadu! Orders usually fly to your doorstep in 3-5 business days. 🚚💨';
      } else if (q.includes('who are you') || q.includes('robot') || q.includes('ai')) {
        responseText =
          "I'm Bernie the Bee! I help keep the SINGGLEBEE hive organized and help customers find the sweetest books. I'm part bee, part librarian, and all helpful! 🐝✨";
      } else {
        // Keyword match
        let match = (products || []).find((p) => q.includes(p.title.toLowerCase()));
        if (!match) match = (products || []).find((p) => q.includes(p.category.toLowerCase()));

        if (match) {
          responseText = `Buzz! I found **${match.title}** for ₹${match.price}. It's a fantastic ${match.category}! Would you like me to show you where to grab it? 🍯`;
        } else {
          responseText =
            "I'm buzzing around, but I couldn't find that specific item. Would you like to see our Bestsellers or check out our Tamil Books section? 🌻";
        }
      }

      res.json({ success: true, data: responseText });
    } catch (localError) {
      res.status(500).json({
        success: false,
        message: 'Bernie is taking a short honey break. Please try again later!',
      });
    }
  }
};
