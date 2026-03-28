import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, User, Menu, X, LogOut, Search, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/hooks/useWishlist";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { itemCount } = useCart();
  const { itemCount: wishlistCount } = useWishlist();
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    if (!location.pathname.startsWith("/shop")) return;
    const q = new URLSearchParams(location.search).get("q") ?? "";
    setSearch(q);
  }, [location.pathname, location.search]);

  const goToSearch = (value: string) => {
    const q = value.trim();
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="font-display text-2xl font-bold tracking-tight">
          <span className="text-gradient">ShoeFinity</span>
        </Link>

        {/* Desktop nav + search */}
        <div className="hidden flex-1 items-center gap-6 px-10 md:flex">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Home
            </Link>
            <Link to="/shop" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Shop
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                Dashboard
              </Link>
            )}
          </div>

          <form
            className="ml-auto flex w-full max-w-sm items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              goToSearch(search);
            }}
          >
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search shoes..."
                aria-label="Search shoes"
                className="h-9 pl-9"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary" className="h-9">
              Search
            </Button>
          </form>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {!isAdmin && user && (
            <>
              <Link to="/wishlist" className="relative rounded-lg p-2 transition-colors hover:bg-secondary">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link to="/cart" className="relative rounded-lg p-2 transition-colors hover:bg-secondary">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {itemCount}
                  </span>
                )}
              </Link>
            </>
          )}
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{user.name}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="mr-1 h-4 w-4" /> Logout
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button variant="default" size="sm">
                <User className="mr-1 h-4 w-4" /> Login
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <div className="flex flex-col gap-4">
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                goToSearch(search);
                setMobileOpen(false);
              }}
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search shoes..."
                  aria-label="Search shoes"
                  className="h-9 pl-9"
                />
              </div>
              <Button type="submit" size="sm" variant="secondary" className="h-9">
                Search
              </Button>
            </form>
            <Link to="/" onClick={() => setMobileOpen(false)} className="text-sm font-medium">Home</Link>
            <Link to="/shop" onClick={() => setMobileOpen(false)} className="text-sm font-medium">Shop</Link>
            {isAdmin && <Link to="/admin" onClick={() => setMobileOpen(false)} className="text-sm font-medium">Dashboard</Link>}
            {!isAdmin && user && (
              <>
                <Link to="/wishlist" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-sm font-medium">
                  <Heart className="h-4 w-4" /> Wishlist ({wishlistCount})
                </Link>
                <Link to="/cart" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-sm font-medium">
                  <ShoppingCart className="h-4 w-4" /> Cart ({itemCount})
                </Link>
              </>
            )}
            {user ? (
              <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="flex items-center gap-2 text-sm font-medium text-destructive">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-primary">Login</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
