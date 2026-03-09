import { GoogleGenAI } from '@google/genai';
import logger from '../utils/logger.js';
import config from '../config/config.js';

/**
 * Shopping Assistant Controller
 * Handles AI-powered chat responses using Gemini API
 */
export const chat = async (req, res) => {
  try {
    const { query, products } = req.body;

    if (!query || !Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Query and products array are required',
        },
      });
    }

    // Initialize Gemini with server-side API key
    const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });

    const productContext = products
      .map(
        (p) =>
          `- ${p.title} by ${p.author} (₹${p.price}, ${p.category}): ${p.description.substring(0, 100)}...`
      )
      .join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `You are a friendly and helpful AI shopping assistant for "SINGGLEBEE", an online marketplace for books, gourmet food, and stationery.
          
      Available Catalog:
      ${productContext}
      
      User Question: "${query}"
      
      Instructions:
      - Provide a helpful, concise response.
      - If you recommend a product, explain why it's a good fit.
      - Use a friendly "bee-themed" tone occasionally (e.g., mention the hive, honey, buzzing).
      - If the user asks for something not in the catalog, suggest the closest alternative or let them know what we have.`,
    });

    const aiResponse = response.text || "I'm sorry, I'm having a bit of trouble finding that information in the hive.";

    logger.info(`Assistant query processed: "${query.substring(0, 50)}..."`);

    res.json({
      success: true,
      response: aiResponse,
    });
  } catch (error) {
    logger.error('Assistant API Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'AI_SERVICE_ERROR',
        message: 'The hive mind is momentarily offline. Please try again in a bit!',
      },
    });
  }
};

export default { chat };
