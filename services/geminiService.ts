
import { GoogleGenAI } from "@google/genai";
import { Product } from "../types.ts";

export const getShoppingAssistantResponse = async (
  query: string,
  products: Product[]
): Promise<string> => {
  try {
    // Fix: Create new instance inside function to use up-to-date process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const productContext = products.map(p =>
      `- ${p.title} by ${p.author} (₹${p.price}, ${p.category}): ${p.description.substring(0, 100)}...`
    ).join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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

    return response.text || "I'm sorry, I'm having a bit of trouble finding that information in the hive.";
  } catch (error) {
    console.error("Hive Assistant Error:", error);
    return "The hive mind is momentarily offline. Please try again in a bit!";
  }
};
