import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Shoe } from "@/types";
import { apiJson } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export function useWishlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const token = user?.token;
  const queryKey = ["wishlist", user?._id];

  const wishlistQuery = useQuery({
    queryKey,
    enabled: Boolean(token && user),
    initialData: [] as Shoe[],
    queryFn: async () => {
      const res = await apiJson<Shoe[]>("/api/users/me/wishlist", {
        method: "GET",
        token,
      });
      if (!res.ok || !Array.isArray(res.data)) throw new Error("Failed to load wishlist");
      return res.data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (shoe: Shoe) => {
      if (!token) throw new Error("Please sign in to manage your wishlist.");
      const res = await apiJson<Shoe[]>(`/api/users/me/wishlist/${shoe._id}/toggle`, {
        method: "POST",
        token,
      });
      if (!res.ok || !Array.isArray(res.data)) throw new Error("Failed to update wishlist");
      return res.data;
    },
    onMutate: async (shoe) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Shoe[]>(queryKey) ?? [];
      const exists = previous.some((item) => item._id === shoe._id);
      queryClient.setQueryData<Shoe[]>(
        queryKey,
        exists ? previous.filter((item) => item._id !== shoe._id) : [shoe, ...previous]
      );
      return { previous };
    },
    onError: (_error, _shoe, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toast.error("We couldn't update your wishlist right now.");
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });

  const items = useMemo(() => (user ? wishlistQuery.data ?? [] : []), [user, wishlistQuery.data]);
  const ids = useMemo(() => new Set(items.map((item) => item._id)), [items]);

  const toggleWishlist = useCallback(
    async (shoe: Shoe) => {
      if (!user || !token) return false;
      try {
        await toggleMutation.mutateAsync(shoe);
        return true;
      } catch {
        return false;
      }
    },
    [toggleMutation, token, user]
  );

  return {
    items,
    itemCount: items.length,
    isLoading: wishlistQuery.isLoading,
    isSaving: toggleMutation.isPending,
    isWishlisted: (shoeId: string) => ids.has(shoeId),
    toggleWishlist,
  };
}
