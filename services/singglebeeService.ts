import api from './api';
import { Product } from '../types.ts';

export const getShoppingAssistantResponse = async (
  query: string,
  products: Product[]
): Promise<string> => {
  try {
    const response = await api.post<{ success: boolean; data: string }>('/assistant/chat', {
      query,
    });

    if (response.success) {
      return response.data;
    }

    return "I'm having trouble connecting to the hive right now.";
  } catch (error: any) {
    console.error('Hive Assistant Error:', error);
    return 'The hive mind is momentarily offline. Please try again in a bit!';
  }
};
