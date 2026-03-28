import { createContext, useContext, useMemo, useCallback, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Address, Order, Shoe } from "@/types";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface ShoeContextType {
  shoes: Shoe[];
  orders: Order[];
  shoesLoading: boolean;
  ordersLoading: boolean;
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

  const pickFromSources = (...keys: string[]) =>
    pick(...sources.flatMap((source) => keys.map((key) => source[key])));

  const street = pick(
    typeof order.address === "string" ? order.address : undefined,
    pickFromSources("street", "addressLine1", "line1", "address1", "address"),
    order.street
  );
  const city = pick(pickFromSources("city", "town"), order.city);
  const state = pick(pickFromSources("state", "province", "region"), order.state);
  const pincode = pick(
    pickFromSources("pincode", "postalCode", "zip", "zipCode"),
    order.pincode,
    order.postalCode,
    order.zip,
    order.zipCode
  );
  const phone = pick(
    pickFromSources("phone", "phoneNumber", "mobile", "mobileNumber"),
    order.phone,
    order.phoneNumber,
    order.mobile,
    order.mobileNumber
  );

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
  const queryClient = useQueryClient();
  const token = user?.token;

  const shoesQuery = useQuery({
    queryKey: ["shoes"],
    initialData: [] as Shoe[],
    queryFn: async () => {
      const res = await apiJson<Shoe[]>("/api/shoes", { method: "GET" });
      if (!res.ok || !Array.isArray(res.data)) throw new Error("Failed to load shoes");
      return res.data;
    },
  });

  const ordersQuery = useQuery({
    queryKey: ["orders", user?._id, user?.role],
    enabled: Boolean(token && user),
    initialData: [] as Order[],
    queryFn: async () => {
      const path = user?.role === "admin" ? "/api/orders" : "/api/orders/mine";
      const res = await apiJson<ApiOrder[]>(path, { method: "GET", token });
      if (!res.ok || !Array.isArray(res.data)) throw new Error("Failed to load orders");
      return res.data.map(normalizeOrder);
    },
  });

  const addShoeMutation = useMutation({
    mutationFn: async (shoe: Omit<Shoe, "_id">) => {
      if (!token) throw new Error("Unauthorized");
      const res = await apiJson<Shoe>("/api/shoes", {
        method: "POST",
        token,
        body: JSON.stringify(shoe),
      });
      if (!res.ok || !res.data?._id) throw new Error("Failed to add shoe");
      return res.data;
    },
    onSuccess: (shoe) => {
      queryClient.setQueryData<Shoe[]>(["shoes"], (previous = []) => [shoe, ...previous]);
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  const updateShoeMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Shoe> }) => {
      if (!token) throw new Error("Unauthorized");
      const res = await apiJson<Shoe>(`/api/shoes/${id}`, {
        method: "PUT",
        token,
        body: JSON.stringify(updates),
      });
      if (!res.ok || !res.data?._id) throw new Error("Failed to update shoe");
      return res.data;
    },
    onSuccess: (shoe) => {
      queryClient.setQueryData<Shoe[]>(["shoes"], (previous = []) =>
        previous.map((item) => (item._id === shoe._id ? shoe : item))
      );
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  const deleteShoeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!token) throw new Error("Unauthorized");
      const res = await apiJson<{ message?: string }>(`/api/shoes/${id}`, {
        method: "DELETE",
        token,
      });
      if (!res.ok) throw new Error("Failed to delete shoe");
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<Shoe[]>(["shoes"], (previous = []) =>
        previous.filter((shoe) => shoe._id !== id)
      );
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    },
  });

  const addOrderMutation = useMutation({
    mutationFn: async (order: Omit<Order, "_id" | "createdAt">) => {
      if (!token) throw new Error("Unauthorized");
      const res = await apiJson<ApiOrder>("/api/orders", {
        method: "POST",
        token,
        body: JSON.stringify(order),
      });
      if (!res.ok || !res.data?._id) throw new Error("Failed to create order");
      return normalizeOrder(res.data);
    },
    onSuccess: (order) => {
      queryClient.setQueryData<Order[]>(
        ["orders", user?._id, user?.role],
        (previous = []) => [order, ...previous]
      );
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.setQueryData(["cart", user?._id], []);
    },
  });

  const addShoe = useCallback(
    async (shoe: Omit<Shoe, "_id">) => {
      try {
        await addShoeMutation.mutateAsync(shoe);
        return true;
      } catch {
        return false;
      }
    },
    [addShoeMutation]
  );

  const updateShoe = useCallback(
    async (id: string, shoe: Partial<Shoe>) => {
      try {
        await updateShoeMutation.mutateAsync({ id, updates: shoe });
        return true;
      } catch {
        return false;
      }
    },
    [updateShoeMutation]
  );

  const deleteShoe = useCallback(
    async (id: string) => {
      try {
        await deleteShoeMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
    [deleteShoeMutation]
  );

  const addOrder = useCallback(
    async (order: Omit<Order, "_id" | "createdAt">) => {
      try {
        await addOrderMutation.mutateAsync(order);
        return true;
      } catch {
        return false;
      }
    },
    [addOrderMutation]
  );

  const shoes = useMemo(() => shoesQuery.data ?? [], [shoesQuery.data]);
  const orders = useMemo(() => (user ? ordersQuery.data ?? [] : []), [ordersQuery.data, user]);

  return (
    <ShoeContext.Provider
      value={{
        shoes,
        orders,
        shoesLoading: shoesQuery.isLoading,
        ordersLoading: ordersQuery.isLoading,
        addShoe,
        updateShoe,
        deleteShoe,
        addOrder,
      }}
    >
      {children}
    </ShoeContext.Provider>
  );
}

export function useShoes() {
  const ctx = useContext(ShoeContext);
  if (!ctx) throw new Error("useShoes must be used within ShoeProvider");
  return ctx;
}
