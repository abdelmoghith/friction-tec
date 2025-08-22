// Enhanced types for the admin panel
export interface Product {
  id: string;
  title: string;
  price: number;
  description: string;
  category: string;
  category_id: string;
  main_image: string;
  gallery_images?: string[];
  rating: {
    rate: number;
    count: number;
  };
  // Admin panel specific fields
  affiliate_earning_price: number;
  in_stock: boolean;
  stock_count: number;
  free_shipping: boolean;
  shipping_cost: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  image?: string;
  product_count?: number;
  potential_earnings?: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  address?: string;
  join_date: string;
  total_orders: number;
  total_spent: number;
  status: 'active' | 'inactive';
  order_history?: Order[];
}

export interface AffiliateWorker {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  commission_rate: number;
  total_earnings: number;
  join_date: string;
  status: 'active' | 'inactive';
}

export interface Order {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_location?: string;
  customer_address?: string;
  affiliate_worker_id?: string;
  affiliate_worker?: AffiliateWorker;
  order_date: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total: number;
  items_count: number;
  payment_method: string;
  shipping_cost: number;
  notes?: string;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name?: string;
  product_image?: string;
  quantity: number;
  price: number;
  affiliate_earnings: number;
}

export interface DeliveryLocation {
  id: string;
  wilaya_code: number;
  wilaya_name: string;
  desk_price: number;
  domicile_price: number;
  enabled: boolean;
}

export interface Payment {
  id: string;
  affiliate_worker_id: string;
  affiliate_worker?: AffiliateWorker;
  amount: number;
  benefit?: number; // Alias for amount for display purposes
  payment_date: string;
  status: 'pending' | 'paid' | 'cancelled';
  payment_method?: string;
  notes?: string;
  user_name?: string; // User name from profiles table
  created_at?: string;
  updated_at?: string;
}

// Dashboard stats interface
export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  conversionRate: number;
  revenueGrowth: number;
  ordersGrowth: number;
  customersGrowth: number;
  conversionGrowth: number;
}

// Chart data interface
export interface ChartData {
  name: string;
  value: number;
  earnings?: number;
  orders?: number;
  revenue?: number;
}

// Buyer interface for dashboard
export interface Buyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  recent_purchase: string;
  total_spent: number;
  avatar?: string;
}

// Form interfaces for creating/updating entities
export interface CreateProductForm {
  title: string;
  description: string;
  price: number;
  affiliate_earning_price: number;
  category_id: string;
  main_image: File | string;
  gallery_images?: (File | string)[];
  in_stock: boolean;
  stock_count: number;
  free_shipping: boolean;
  shipping_cost: number;
}

export interface CreateCategoryForm {
  name: string;
  image?: File | string;
}

export interface CreateCustomerForm {
  name: string;
  email: string;
  phone: string;
  location: string;
  address?: string;
}

export interface CreateOrderForm {
  customer_id: string;
  affiliate_worker_id?: string;
  payment_method: string;
  shipping_cost: number;
  notes?: string;
  items: {
    product_id: string;
    quantity: number;
    price: number;
  }[];
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  limit: number;
  total_pages: number;
}

// User Profile types (simplified)
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  access: string[];
}

// Search and filter types
export interface SearchFilters {
  query?: string;
  category?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// Notification types
export interface NotificationSettings {
  new_orders: boolean;
  payments: boolean;
  telegram_user_id?: string;
}

// Location types for warehouse zones
export type ZoneType = 'with_etages' | 'with_parts';

export interface Etage {
  name: string;
  places: number; // Number of places in this étage
  currentStock?: number; // Current stock in this étage
}

export interface ZoneWithEtages {
  id: string;
  type: 'with_etages';
  name: string;
  description?: string;
  is_prison?: boolean;
  etages: Etage[];
}

export interface Part {
  name: string;
  maxCapacity: number;
  currentStock: number;
}

export interface ZoneWithParts {
  id: string;
  type: 'with_parts';
  name: string;
  description?: string;
  is_prison?: boolean;
  parts: Part[];
}

export type Zone = ZoneWithEtages | ZoneWithParts;
