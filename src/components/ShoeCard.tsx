import type { Shoe } from "@/types";
import { Heart, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/hooks/useWishlist";
import { toast } from "sonner";
import { useState } from "react";
import { formatINR } from "@/lib/currency";

interface ShoeCardProps {
  shoe: Shoe;
}

const ShoeCard = ({ shoe }: ShoeCardProps) => {
  const { addToCart } = useCart();
  const { user, isAdmin } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [selectedSize, setSelectedSize] = useState(shoe.sizes[0]);
  const wishlisted = isWishlisted(shoe._id);

  const handleAdd = () => {
    if (!user) {
      toast.error("Please login to add items to cart");
      return;
    }
    addToCart(shoe, selectedSize);
    toast.success(`${shoe.name} added to cart!`);
  };

  const handleWishlist = async () => {
    if (!user) {
      toast.error("Please login to save favorites");
      return;
    }

    const ok = await toggleWishlist(shoe);
    if (!ok) return;
    toast.success(wishlisted ? `${shoe.name} removed from wishlist` : `${shoe.name} saved to wishlist`);
  };

  return (
    <div className="group overflow-hidden rounded-lg border border-border bg-card shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <img
          src={shoe.image}
          alt={shoe.name}
          className="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-110"
        />
        <span className="absolute left-3 top-3 rounded-md bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
          {shoe.category}
        </span>
        {!isAdmin && (
          <button
            type="button"
            onClick={handleWishlist}
            className={`absolute right-3 top-3 rounded-full border p-2 transition-colors ${
              wishlisted
                ? "border-rose-200 bg-rose-500 text-white"
                : "border-border bg-background/90 text-muted-foreground hover:text-foreground"
            }`}
            aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className={`h-4 w-4 ${wishlisted ? "fill-current" : ""}`} />
          </button>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-display text-lg font-semibold">{shoe.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{shoe.description}</p>

        <div className="mt-3 flex flex-wrap gap-1">
          {shoe.sizes.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedSize(s)}
              className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                selectedSize === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="font-display text-xl font-bold text-gradient">{formatINR(shoe.price)}</span>
          <Button size="sm" onClick={handleAdd}>
            <ShoppingCart className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ShoeCard;
