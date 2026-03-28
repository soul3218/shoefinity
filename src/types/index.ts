export interface Shoe {
  _id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
  sizes: number[];
  inStock: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  token?: string;
}

export interface CartItem {
  shoe: Shoe;
  shoeName?: string;
  unitPrice?: number;
  quantity: number;
  size: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
}

export interface Order {
  _id: string;
  userId: string;
  userName: string;
  items: CartItem[];
  subtotal?: number;
  discount?: number;
  couponCode?: string;
  total: number;
  paymentMethod: "online" | "card" | "cod";
  status: "pending" | "confirmed" | "shipped" | "delivered";
  address?: Address;
  createdAt: string;
}

export interface CouponInfo {
  code: string;
  description: string;
  type: "percentage" | "fixed";
  value: number;
  minSubtotal?: number;
  maxDiscount?: number;
}

export interface CouponPreview {
  valid: boolean;
  message: string;
  code: string;
  discount: number;
  subtotal: number;
  total: number;
  coupon?: CouponInfo;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalDiscount: number;
  totalCustomers: number;
  totalProducts: number;
  totalUnitsSold: number;
  pendingOrders: number;
  deliveredOrders: number;
}

export interface RevenuePoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface StatusPoint {
  status: Order["status"];
  count: number;
}

export interface PaymentPoint {
  method: Order["paymentMethod"];
  count: number;
}

export interface TopProductStat {
  shoeId?: string;
  name: string;
  unitsSold: number;
  revenue: number;
}

export interface RecentOrderStat {
  _id: string;
  userName: string;
  total: number;
  status: Order["status"];
  createdAt: string;
}

export interface OrderAnalytics {
  summary: AnalyticsSummary;
  revenueSeries: RevenuePoint[];
  statusSeries: StatusPoint[];
  paymentSeries: PaymentPoint[];
  topProducts: TopProductStat[];
  recentOrders: RecentOrderStat[];
}
