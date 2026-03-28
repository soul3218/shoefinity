import { Heart } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShoeCard from "@/components/ShoeCard";
import { useWishlist } from "@/hooks/useWishlist";

const Wishlist = () => {
  const { items, isLoading } = useWishlist();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-10">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-3xl font-bold md:text-4xl">
            Your <span className="text-gradient">Wishlist</span>
          </h1>

          {isLoading && <p className="mt-4 text-sm text-muted-foreground">Loading your favorites...</p>}

          {!isLoading && items.length === 0 && (
            <div className="mt-20 text-center">
              <Heart className="mx-auto h-16 w-16 text-muted-foreground/30" />
              <p className="mt-4 text-lg text-muted-foreground">You haven't saved any favorites yet.</p>
            </div>
          )}

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((shoe, index) => (
              <div key={shoe._id} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <ShoeCard shoe={shoe} />
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Wishlist;
