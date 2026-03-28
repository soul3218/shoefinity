export interface Shoe {
  _id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
  sizes: number[];
  inStock: boolean;
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
  total: number;
  paymentMethod: "online" | "card" | "cod";
  status: "pending" | "confirmed" | "shipped" | "delivered";
  address?: Address;
  createdAt: string;
}
