import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { formatINR } from "@/lib/currency";

const Cart = () => {
  const { items, removeFromCart, updateQuantity, total, itemCount, isLoading, isSyncing } = useCart();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-10">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-3xl font-bold">
            Your <span className="text-gradient">Cart</span>
          </h1>

          {isLoading && (
            <p className="mt-4 text-sm text-muted-foreground">Loading your saved cart...</p>
          )}
          {!isLoading && isSyncing && (
            <p className="mt-4 text-sm text-muted-foreground">Saving your cart...</p>
          )}

          {items.length === 0 ? (
            <div className="mt-20 text-center">
              <ShoppingBag className="mx-auto h-16 w-16 text-muted-foreground/30" />
              <p className="mt-4 text-lg text-muted-foreground">Your cart is empty</p>
              <Link to="/shop">
                <Button className="mt-6 shadow-button">Continue Shopping</Button>
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <div
                    key={`${item.shoe._id}-${item.size}`}
                    className="flex gap-4 rounded-lg border border-border bg-card p-4 shadow-card animate-fade-in"
                  >
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-secondary">
                      <img src={item.shoe.image} alt={item.shoe.name} className="h-full w-full object-contain p-2" />
                    </div>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="font-display font-semibold">{item.shoe.name}</h3>
                        <p className="text-sm text-muted-foreground">Size: {item.size}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.shoe._id, item.size, item.quantity - 1)}
                            className="rounded-md border border-border p-1 transition-colors hover:bg-secondary"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.shoe._id, item.size, item.quantity + 1)}
                            className="rounded-md border border-border p-1 transition-colors hover:bg-secondary"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="font-display font-bold">
                          {formatINR((item.unitPrice ?? item.shoe.price) * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.shoe._id, item.size)}
                          className="rounded-md p-1 text-destructive transition-colors hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border bg-card p-6 shadow-card h-fit sticky top-24">
                <h2 className="font-display text-lg font-semibold">Order Summary</h2>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items ({itemCount})</span>
                    <span>{formatINR(total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-success">Free</span>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between font-display text-lg font-bold">
                      <span>Total</span>
                      <span className="text-gradient">{formatINR(total)}</span>
                    </div>
                  </div>
                </div>
                <Link to="/checkout">
                  <Button className="mt-6 w-full shadow-button" size="lg">
                    Proceed to Checkout
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Cart;
