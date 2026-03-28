import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ShoeCard from "@/components/ShoeCard";
import { useShoes } from "@/contexts/ShoeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function normalizeCategory(value: string) {
  return value.trim().toLowerCase();
}

const Shop = () => {
  const { shoes } = useShoes();
  const [searchParams, setSearchParams] = useSearchParams();

  const query = (searchParams.get("q") ?? "").trim();
  const activeCategory = normalizeCategory(searchParams.get("category") ?? "all");
  const minPrice = searchParams.get("minPrice") ?? "";
  const maxPrice = searchParams.get("maxPrice") ?? "";
  const activeSize = searchParams.get("size") ?? "";
  const sort = searchParams.get("sort") ?? "newest";

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    shoes.forEach((shoe) => {
      const key = normalizeCategory(shoe.category || "other");
      if (!map.has(key)) map.set(key, shoe.category || "Other");
    });

    return [{ key: "all", label: "All" }, ...Array.from(map.entries()).map(([key, label]) => ({ key, label }))];
  }, [shoes]);

  const sizes = useMemo(
    () => Array.from(new Set(shoes.flatMap((shoe) => shoe.sizes))).sort((a, b) => a - b),
    [shoes]
  );

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "all" || value === "newest") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    setSearchParams(next);
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const min = Number(minPrice);
    const max = Number(maxPrice);
    const size = Number(activeSize);

    const result = shoes.filter((shoe) => {
      const matchesCategory =
        activeCategory === "all" || normalizeCategory(shoe.category) === activeCategory;
      const haystack = `${shoe.name} ${shoe.description} ${shoe.category}`.toLowerCase();
      const matchesQuery = q.length === 0 || haystack.includes(q);
      const matchesMin = !minPrice || (!Number.isNaN(min) && shoe.price >= min);
      const matchesMax = !maxPrice || (!Number.isNaN(max) && shoe.price <= max);
      const matchesSize = !activeSize || (!Number.isNaN(size) && shoe.sizes.includes(size));

      return matchesCategory && matchesQuery && matchesMin && matchesMax && matchesSize;
    });

    return result.sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "name-asc") return a.name.localeCompare(b.name);
      const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bCreated - aCreated;
    });
  }, [activeCategory, activeSize, maxPrice, minPrice, query, shoes, sort]);

  const hasActiveFilters = Boolean(activeCategory !== "all" || minPrice || maxPrice || activeSize || sort !== "newest");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-10">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-3xl font-bold md:text-4xl">
            All <span className="text-gradient">Sneakers</span>
          </h1>

          <div className="mt-6 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.key}
                onClick={() => updateParams({ category: category.key })}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeCategory === category.key
                    ? "bg-primary text-primary-foreground shadow-button"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-4 shadow-card md:grid-cols-5">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Min Price</label>
              <Input
                type="number"
                min="0"
                value={minPrice}
                onChange={(event) => updateParams({ minPrice: event.target.value })}
                placeholder="0"
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Max Price</label>
              <Input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(event) => updateParams({ maxPrice: event.target.value })}
                placeholder="20000"
                className="mt-2"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Size</label>
              <select
                value={activeSize}
                onChange={(event) => updateParams({ size: event.target.value })}
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All sizes</option>
                {sizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sort</label>
              <select
                value={sort}
                onChange={(event) => updateParams({ sort: event.target.value })}
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to high</option>
                <option value="price-desc">Price: High to low</option>
                <option value="name-asc">Name</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                disabled={!hasActiveFilters}
                onClick={() =>
                  updateParams({
                    category: "all",
                    minPrice: null,
                    maxPrice: null,
                    size: null,
                    sort: "newest",
                  })
                }
              >
                Clear Filters
              </Button>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filtered.length} result{filtered.length === 1 ? "" : "s"}
            {query ? ` for "${query}"` : ""}.
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((shoe, index) => (
              <div key={shoe._id} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <ShoeCard shoe={shoe} />
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="mt-12 text-center text-muted-foreground">
              No shoes match the current search and filters.
            </p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Shop;
