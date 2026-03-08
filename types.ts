
export enum Category {
  FICTION = 'Fiction',
  SELF_HELP = 'Self-Help',
  TECH = 'Technology',
  SCIFI = 'Sci-Fi',
  BUSINESS = 'Business',
  MYSTERY = 'Mystery',
  BIOGRAPHY = 'Biography',
  FOOD = 'Foods',
  STATIONERY = 'Stationeries',
  BOOKS = 'Books',
  POEM_BOOK = 'Poem Book',
  STORY_BOOK = 'Story Book',
  ALL = 'All'
}

export interface Review {
  id: number;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Product {
  id: number;
  title: string;
  author: string;
  price: number;
  rating: number; // 1-5
  reviewCount: number;
  image: string;
  category: Category;
  description: string;
  bestseller?: boolean;
  pages?: number;
  language?: string;
  format?: 'Hardcover' | 'Paperback' | 'Kindle' | 'Box' | 'Pack' | 'Jar' | 'Set';
  reviews?: Review[];
  isComingSoon?: boolean;
  isOutOfStock?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  phoneNumber?: string;
  streetAddress?: string;
  landmark?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  preferredCategory?: Category;
  role?: 'user' | 'admin';
  mustChangePassword?: boolean;
}
