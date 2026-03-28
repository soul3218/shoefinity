import { createContext, useContext, useMemo, useCallback, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CartItem, Shoe } from "@/types";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface CartContextType {
  items: CartItem[];
  addToCart: (shoe: Shoe, size: number) => void;
  removeFromCart: (shoeId: string, size: number) => void;
  updateQuantity: (shoeId: string, size: number, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  isLoading: boolean;
  isSyncing: boolean;
}

const CartContext = createContext<CartContextType | null>(null);

function toCartPayload(items: CartItem[]) {
  return items.map((item) => ({
    shoe: item.shoe._id,
    quantity: item.quantity,
    size: item.size,
  }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const token = user?.token;
  const cartQueryKey = ["cart", user?._id];

  const cartQuery = useQuery({
    queryKey: cartQueryKey,
    enabled: Boolean(token && user),
    initialData: [] as CartItem[],
    queryFn: async () => {
      const res = await apiJson<CartItem[]>("/api/users/me/cart", {
        method: "GET",
        token,
      });
      if (!res.ok || !Array.isArray(res.data)) throw new Error("Failed to load cart");
      return res.data;
    },
  });

  const syncCartMutation = useMutation({
    mutationFn: async (items: CartItem[]) => {
      if (!token) throw new Error("Please sign in to use the cart.");
      const res = await apiJson<CartItem[]>("/api/users/me/cart", {
        method: "PUT",
        token,
        body: JSON.stringify({ items: toCartPayload(items) }),
      });
      if (!res.ok || !Array.isArray(res.data)) {
        throw new Error("Failed to save cart");
      }
      return res.data;
    },
    onMutate: async (nextItems) => {
      await queryClient.cancelQueries({ queryKey: cartQueryKey });
      const previousItems = queryClient.getQueryData<CartItem[]>(cartQueryKey) ?? [];
      queryClient.setQueryData(cartQueryKey, nextItems);
      return { previousItems };
    },
    onError: (_error, _nextItems, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(cartQueryKey, context.previousItems);
      }
      toast.error("We couldn't sync your cart. Please try again.");
    },
    onSuccess: (serverItems) => {
      queryClient.setQueryData(cartQueryKey, serverItems);
    },
  });

  const updateCart = useCallback(
    (updater: (items: CartItem[]) => CartItem[]) => {
      if (!user || !token) return;
      const currentItems = queryClient.getQueryData<CartItem[]>(cartQueryKey) ?? [];
      const nextItems = updater(currentItems);
      syncCartMutation.mutate(nextItems);
    },
    [cartQueryKey, queryClient, syncCartMutation, token, user]
  );

  const addToCart = useCallback(
    (shoe: Shoe, size: number) => {
      updateCart((items) => {
        const existing = items.find((item) => item.shoe._id === shoe._id && item.size === size);
        if (existing) {
          return items.map((item) =>
            item.shoe._id === shoe._id && item.size === size
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }

        return [...items, { shoe, quantity: 1, size, unitPrice: shoe.price, shoeName: shoe.name }];
      });
    },
    [updateCart]
  );

  const removeFromCart = useCallback(
    (shoeId: string, size: number) => {
      updateCart((items) => items.filter((item) => !(item.shoe._id === shoeId && item.size === size)));
    },
    [updateCart]
  );

  const updateQuantity = useCallback(
    (shoeId: string, size: number, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(shoeId, size);
        return;
      }

      updateCart((items) =>
        items.map((item) =>
          item.shoe._id === shoeId && item.size === size ? { ...item, quantity } : item
        )
      );
    },
    [removeFromCart, updateCart]
  );

  const clearCart = useCallback(() => {
    if (!user || !token) return;
    syncCartMutation.mutate([]);
  }, [syncCartMutation, token, user]);

  const items = useMemo(() => (user ? cartQuery.data ?? [] : []), [cartQuery.data, user]);
  const total = items.reduce((sum, item) => sum + (item.unitPrice ?? item.shoe.price) * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        total,
        itemCount,
        isLoading: cartQuery.isLoading,
        isSyncing: syncCartMutation.isPending,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
