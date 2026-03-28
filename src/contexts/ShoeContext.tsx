import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import type { Address, Shoe, Order } from "@/types";
import { mockShoes, mockOrders } from "@/data/mockData";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface ShoeContextType {
  shoes: Shoe[];
  orders: Order[];
  addShoe: (shoe: Omit<Shoe, "_id">) => Promise<boolean>;
  updateShoe: (id: string, shoe: Partial<Shoe>) => Promise<boolean>;
  deleteShoe: (id: string) => Promise<boolean>;
  addOrder: (order: Omit<Order, "_id" | "createdAt">) => Promise<boolean>;
}

const ShoeContext = createContext<ShoeContextType | null>(null);

type ApiAddress = Partial<Address> | string | null | undefined;

type ApiOrder = Order & {
  address?: ApiAddress;
  shippingAddress?: ApiAddress;
  deliveryAddress?: ApiAddress;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | number | null;
  postalCode?: string | number | null;
  zip?: string | number | null;
  zipCode?: string | number | null;
  phone?: string | number | null;
  phoneNumber?: string | number | null;
  mobile?: string | number | null;
  mobileNumber?: string | number | null;
};

function readText(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "number") return String(value);
  return undefined;
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function normalizeOrderAddress(order: ApiOrder): Address | undefined {
  const sources = [order.address, order.shippingAddress, order.deliveryAddress]
    .map(asRecord)
    .filter((value): value is Record<string, unknown> => Boolean(value));

  const pick = (...values: unknown[]) => {
    for (const value of values) {
      const text = readText(value);
      if (text) return text;
    }
    return "";
  };

  const pickFromSources = (...keys: string[]) => pick(...sources.flatMap((source) => keys.map((key) => source[key])));

  const street = pick(
    typeof order.address === "string" ? order.address : undefined,
    pickFromSources("street", "addressLine1", "line1", "address1", "address"),
    order.street
  );
  const city = pick(pickFromSources("city", "town"), order.city);
  const state = pick(pickFromSources("state", "province", "region"), order.state);
  const pincode = pick(pickFromSources("pincode", "postalCode", "zip", "zipCode"), order.pincode, order.postalCode, order.zip, order.zipCode);
  const phone = pick(pickFromSources("phone", "phoneNumber", "mobile", "mobileNumber"), order.phone, order.phoneNumber, order.mobile, order.mobileNumber);

  if (![street, city, state, pincode, phone].some(Boolean)) return undefined;

  return { street, city, state, pincode, phone };
}

function normalizeOrder(order: ApiOrder): Order {
  return {
    ...order,
    address: normalizeOrderAddress(order),
  };
}

export function ShoeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [shoes, setShoes] = useState<Shoe[]>(mockShoes);
  const [orders, setOrders] = useState<Order[]>(mockOrders.map(normalizeOrder));

  const token = useMemo(() => user?.token ?? localStorage.getItem("token") ?? undefined, [user?.token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await apiJson<Shoe[]>("/api/shoes", { method: "GET" });
      if (!cancelled && res.ok && Array.isArray(res.data)) setShoes(res.data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token || !user) {
        setOrders([]);
        return;
      }
      const path = user.role === "admin" ? "/api/orders" : "/api/orders/mine";
      const res = await apiJson<ApiOrder[]>(path, { method: "GET", token });
      if (!cancelled && res.ok && Array.isArray(res.data)) setOrders(res.data.map(normalizeOrder));
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user]);

  const addShoe = useCallback(
    async (shoe: Omit<Shoe, "_id">) => {
      if (!token) return false;
      const res = await apiJson<Shoe>("/api/shoes", { method: "POST", token, body: JSON.stringify(shoe) });
      if (!res.ok) return false;
      setShoes((prev) => [res.data, ...prev]);
      return true;
    },
    [token]
  );

  const updateShoe = useCallback(
    async (id: string, updates: Partial<Shoe>) => {
      if (!token) return false;
      const res = await apiJson<Shoe>(`/api/shoes/${id}`, { method: "PUT", token, body: JSON.stringify(updates) });
      if (!res.ok) return false;
      setShoes((prev) => prev.map((s) => (s._id === id ? res.data : s)));
      return true;
    },
    [token]
  );

  const deleteShoe = useCallback(
    async (id: string) => {
      if (!token) return false;
      const res = await apiJson<{ message?: string }>("/api/shoes/" + id, { method: "DELETE", token });
      if (!res.ok) return false;
      setShoes((prev) => prev.filter((s) => s._id !== id));
      return true;
    },
    [token]
  );

  const addOrder = useCallback(
    async (order: Omit<Order, "_id" | "createdAt">) => {
      if (!token) return false;
      const res = await apiJson<ApiOrder>("/api/orders", { method: "POST", token, body: JSON.stringify(order) });
      if (!res.ok) return false;
      setOrders((prev) => [normalizeOrder(res.data), ...prev]);
      return true;
    },
    [token]
  );

  return (
    <ShoeContext.Provider value={{ shoes, orders, addShoe, updateShoe, deleteShoe, addOrder }}>
      {children}
    </ShoeContext.Provider>
  );
}

export function useShoes() {
  const ctx = useContext(ShoeContext);
  if (!ctx) throw new Error("useShoes must be used within ShoeProvider");
  return ctx;
}
