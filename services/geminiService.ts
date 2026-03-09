import api from './api';
import { Product } from '../types.ts';

export const getShoppingAssistantResponse = async (
  query: string,
  products: Product[]
): Promise<string> => {
  try {
    const result = await api.post<{ response: string }>('/assistant/chat', {
      query,
      products: products.map(p => ({
        id: p.id,
        title: p.title,
        author: p.author,
        price: p.price,
        category: p.category,
        description: p.description.substring(0, 100)
      }))
    });
    
    return result.response || "I'm sorry, I'm having a bit of trouble finding that information in the hive.";
  } catch (error) {
    console.error('Hive Assistant Error:', error);
    return 'The hive mind is momentarily offline. Please try again in a bit!';
  }
};
