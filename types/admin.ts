// Admin Types for SINGGLEBEE Admin Hive

export interface AdminStats {
  products: {
    total: number;
    active: number;
    outOfStock: number;
    lowStock: number;
  };
  orders: {
    total: number;
    pending: number;
    verified: number;
  };
  revenue: {
    total: number;
    averageOrderValue: number;
  };
  users: {
    total: number;
    recent: number;
  };
  categoryDistribution: Array<{
    category: string;
    count: number;
  }>;
  period: string;
  dateRange: {
    start: Date;
    end: Date;
  };
}

export interface ProductImage {
  url: string;
  alt: string;
  isPrimary: boolean;
}

export interface AdminProduct {
  _id: string;
  title: string;
  author: string;
  price: number;
  category: 'Books' | 'Poem Book' | 'Story Book' | 'Stationeries' | 'Foods' | 'Honey';
  description: string;
  name?: string;
  discount: number;
  stockQuantity: number;
  sku: string;
  images: ProductImage[];
  image?: string; // Legacy field
  thumbnailUrl?: string;
  status: 'active' | 'inactive' | 'out_of_stock';
  bestseller: boolean;
  language: 'Tamil' | 'English' | 'Bilingual';
  pages?: number;
  format?: 'Hardcover' | 'Paperback' | 'Digital' | 'Box' | 'Pack' | 'Jar' | 'Set';
  rating: number;
  reviewCount: number;
  adminNotes?: string;
  costPrice?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductFormData {
  title: string;
  author: string;
  price: number;
  category: string;
  description: string;
  name?: string;
  discount: number;
  stockQuantity: number;
  sku?: string;
  images?: ProductImage[];
  image?: string;
  status: 'active' | 'inactive' | 'out_of_stock';
  bestseller: boolean;
  language: 'Tamil' | 'English' | 'Bilingual';
  pages?: number;
  format?: string;
  adminNotes?: string;
  costPrice?: number;
}

export interface AdminOrder {
  _id: string;
  orderId: string;
  user: {
    _id: string;
    email: string;
    fullName: string;
  };
  items: Array<{
    product: {
      _id: string;
      title: string;
      image?: string;
    };
    quantity: number;
    price: number;
  }>;
  total: number;
  status: 'pending' | 'verified' | 'shipped' | 'delivered' | 'cancelled';
  paymentMethod: 'cashfree' | 'upi_manual' | 'cod';
  shippingAddress: {
    fullName: string;
    phone: string;
    email: string;
    street: string;
    landmark?: string;
    city: string;
    state: string;
    zipCode: string;
  };
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
  adminNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface OrderVerifyData {
  status: 'verified' | 'cancelled';
  rejectionReason?: string;
  adminNotes?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AdminProductsResponse {
  products: AdminProduct[];
  pagination: PaginationInfo;
}

export interface AdminOrdersResponse {
  orders: AdminOrder[];
  pagination: PaginationInfo;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  language?: string;
  bestseller?: boolean;
  sortBy?: 'createdAt' | 'title' | 'price' | 'stockQuantity' | 'rating';
  sortOrder?: 'asc' | 'desc';
  includeDeleted?: boolean;
}

export interface OrderQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  paymentMethod?: string;
  search?: string;
  sortBy?: 'createdAt' | 'total' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface StatsQueryParams {
  period?: 'today' | 'week' | 'month' | 'year' | 'all';
  startDate?: Date;
  endDate?: Date;
}

export interface NotificationMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string[];
    borderWidth?: number;
  }>;
}

export interface AdminUser {
  _id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}
