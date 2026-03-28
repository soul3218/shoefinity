import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, XAxis, YAxis } from "recharts";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Package, ShoppingBag, BarChart3, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useShoes } from "@/contexts/ShoeContext";
import { formatINR } from "@/lib/currency";
import type { OrderAnalytics, Shoe } from "@/types";
import { apiJson } from "@/lib/api";
import { uploadProductImage, cloudinaryEnabled } from "@/lib/cloudinary";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const parseSizes = (value: string) =>
  value
    .split(",")
    .map((size) => Number(size.trim()))
    .filter((size, index, array) => Number.isFinite(size) && size > 0 && array.indexOf(size) === index);

const productSchema = z.object({
  name: z.string().min(2, "Product name is required."),
  price: z.coerce.number().positive("Price must be greater than zero."),
  image: z.string().min(1, "Provide an image URL or upload a file."),
  description: z.string().min(10, "Description should be at least 10 characters."),
  category: z.string().min(2, "Category is required."),
  sizesText: z
    .string()
    .min(1, "Enter at least one size.")
    .refine((value) => parseSizes(value).length > 0, "Enter sizes like 7, 8, 9."),
  inStock: z.boolean(),
});

type ProductFormValues = z.infer<typeof productSchema>;

const defaultProductValues: ProductFormValues = {
  name: "",
  price: 0,
  image: "",
  description: "",
  category: "",
  sizesText: "7, 8, 9, 10, 11",
  inStock: true,
};

const revenueChartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--primary))" },
  orders: { label: "Orders", color: "hsl(24 95% 53%)" },
};

const statusColors = ["#2563eb", "#14b8a6", "#f59e0b", "#ef4444"];
const paymentColors = ["#8b5cf6", "#10b981", "#f97316"];

const AdminDashboard = () => {
  const { user } = useAuth();
  const { shoes, orders, shoesLoading, ordersLoading, addShoe, updateShoe, deleteShoe } = useShoes();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultProductValues,
  });

  const analyticsQuery = useQuery({
    queryKey: ["analytics"],
    enabled: Boolean(user?.token),
    queryFn: async () => {
      const res = await apiJson<OrderAnalytics>("/api/orders/analytics", {
        method: "GET",
        token: user?.token,
      });
      if (!res.ok || !res.data?.summary) throw new Error("Failed to load analytics");
      return res.data;
    },
  });

  const analytics = analyticsQuery.data;

  const resetProductForm = () => {
    setEditingId(null);
    setShowForm(false);
    form.reset(defaultProductValues);
  };

  const handleEdit = (shoe: Shoe) => {
    setEditingId(shoe._id);
    setShowForm(true);
    form.reset({
      name: shoe.name,
      price: shoe.price,
      image: shoe.image,
      description: shoe.description,
      category: shoe.category,
      sizesText: shoe.sizes.join(", "),
      inStock: shoe.inStock,
    });
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteShoe(id);
    if (!ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Product deleted");
  };

  const handleSave = async (values: ProductFormValues) => {
    const payload = {
      name: values.name.trim(),
      price: values.price,
      image: values.image.trim(),
      description: values.description.trim(),
      category: values.category.trim(),
      sizes: parseSizes(values.sizesText),
      inStock: values.inStock,
    };

    const ok = editingId ? await updateShoe(editingId, payload) : await addShoe(payload as Omit<Shoe, "_id">);
    if (!ok) {
      toast.error(editingId ? "Update failed" : "Add failed");
      return;
    }

    toast.success(editingId ? "Product updated" : "Product added");
    resetProductForm();
  };

  const handleImageUpload = async (file?: File | null) => {
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const result = await uploadProductImage(file);
      form.setValue("image", result.url, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      toast.success(
        result.storage === "cloudinary"
          ? "Image uploaded to Cloudinary"
          : "Image uploaded inline. Configure Cloudinary if you want hosted uploads."
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast.error(message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                Admin <span className="text-gradient">Dashboard</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage products, review orders, and watch performance in one place.
              </p>
            </div>

            <Button
              onClick={() => {
                if (showForm && !editingId) {
                  resetProductForm();
                  return;
                }
                setShowForm(true);
                setEditingId(null);
                form.reset(defaultProductValues);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              {showForm && !editingId ? "Close Form" : "Add Product"}
            </Button>
          </div>

          {showForm && (
            <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{editingId ? "Edit Product" : "Add Product"}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Paste an image URL, or upload a file. Files go to Cloudinary when configured, otherwise they are stored inline.
                  </p>
                </div>
                <Button variant="outline" onClick={resetProductForm}>
                  Cancel
                </Button>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSave)} className="mt-6 space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Blaze Runner X" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl>
                            <Input placeholder="Running" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="sizesText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sizes</FormLabel>
                          <FormControl>
                            <Input placeholder="7, 8, 9, 10, 11" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="sm:col-span-2 rounded-xl border border-dashed border-border bg-secondary/20 p-4">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-medium">Image Upload</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {cloudinaryEnabled
                              ? "Choose an image file to upload to Cloudinary, or paste a URL below."
                              : "Cloudinary env vars are missing, so uploads will be stored inline instead."}
                          </p>
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-background">
                          <UploadCloud className="h-4 w-4" />
                          {isUploadingImage ? "Uploading..." : "Upload Image"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isUploadingImage}
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              void handleImageUpload(file);
                              event.target.value = "";
                            }}
                          />
                        </label>
                      </div>

                      <div
                        className={`mt-4 rounded-lg border border-dashed p-6 text-center text-sm ${
                          cloudinaryEnabled ? "border-primary/40 bg-background/80" : "border-border bg-background/40"
                        }`}
                        onDragOver={(event) => {
                          event.preventDefault();
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          void handleImageUpload(event.dataTransfer.files?.[0]);
                        }}
                      >
                        Drag and drop an image here, or use the upload button above.
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="image"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Image URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/shoe.jpg or /shoes/shoe-1.png" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("image") && (
                      <div className="sm:col-span-2 overflow-hidden rounded-xl border border-border bg-secondary/30 p-4">
                        <p className="mb-3 text-sm font-medium">Preview</p>
                        <img src={form.watch("image")} alt="Product preview" className="h-40 w-full rounded-lg object-contain" />
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea rows={4} placeholder="Describe the shoe, comfort, and style." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="inStock"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <label className="flex items-center gap-3 rounded-lg border border-border px-4 py-3">
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={(event) => field.onChange(event.target.checked)}
                              className="h-4 w-4 rounded border-border"
                            />
                            <span className="text-sm font-medium">Product is in stock</span>
                          </label>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" disabled={form.formState.isSubmitting || isUploadingImage}>
                    {form.formState.isSubmitting ? "Saving..." : editingId ? "Update Product" : "Add Product"}
                  </Button>
                </form>
              </Form>
            </div>
          )}

          <Tabs defaultValue="products" className="mt-8">
            <TabsList className="flex flex-wrap gap-2">
              <TabsTrigger value="products">
                <Package className="mr-1 h-4 w-4" />
                Products ({shoes.length})
              </TabsTrigger>
              <TabsTrigger value="orders">
                <ShoppingBag className="mr-1 h-4 w-4" />
                Orders ({orders.length})
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="mr-1 h-4 w-4" />
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products">
              <div className="mt-4 space-y-3">
                {shoesLoading && <p className="text-sm text-muted-foreground">Loading products...</p>}
                {shoes.map((shoe) => (
                  <div key={shoe._id} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-card sm:flex-row sm:items-center">
                    <img src={shoe.image} alt={shoe.name} className="h-20 w-20 rounded-lg bg-secondary object-contain p-2" />

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{shoe.name}</h3>
                        <span className="rounded-full bg-secondary px-2 py-1 text-xs text-muted-foreground">
                          {shoe.category}
                        </span>
                        {!shoe.inStock && (
                          <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive">
                            Out of stock
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{shoe.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span>{formatINR(shoe.price)}</span>
                        <span>Sizes: {shoe.sizes.join(", ")}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(shoe)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(shoe._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="orders">
              <div className="mt-4 space-y-4">
                {ordersLoading && <p className="text-sm text-muted-foreground">Loading orders...</p>}
                {!ordersLoading && orders.length === 0 && (
                  <p className="text-center text-muted-foreground">No orders yet</p>
                )}

                {orders.map((order) => (
                  <div key={order._id} className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-card">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold">{order.userName}</h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="font-bold">{formatINR(order.total)}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.paymentMethod} - {order.status}
                        </p>
                        {order.couponCode && (
                          <p className="text-xs text-success">
                            Coupon {order.couponCode} saved {formatINR(order.discount ?? 0)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 text-sm md:grid-cols-2">
                      <div>
                        <p className="font-medium">Address</p>
                        <p>{order.address?.street || "N/A"}</p>
                        <p>
                          {[order.address?.city, order.address?.state].filter(Boolean).join(", ")}
                          {order.address?.pincode ? ` - ${order.address.pincode}` : ""}
                        </p>
                        {order.address?.phone && <p className="text-muted-foreground">Phone: {order.address.phone}</p>}
                      </div>

                      <div>
                        <p className="font-medium">Totals</p>
                        <p className="text-muted-foreground">Subtotal: {formatINR(order.subtotal ?? order.total)}</p>
                        <p className="text-muted-foreground">Discount: {formatINR(order.discount ?? 0)}</p>
                        <p className="font-medium">Payable: {formatINR(order.total)}</p>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      {order.items.map((item, index) => (
                        <p key={`${order._id}-${index}`}>
                          {item.shoe?.name || item.shoeName} x{item.quantity} (Size {item.size}) -{" "}
                          {formatINR((item.unitPrice ?? item.shoe?.price ?? 0) * item.quantity)}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="mt-4 space-y-6">
                {analyticsQuery.isLoading && <p className="text-sm text-muted-foreground">Loading analytics...</p>}
                {analyticsQuery.isError && (
                  <p className="text-sm text-destructive">Analytics failed to load. Check the backend admin route.</p>
                )}

                {analytics && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
                        <p className="text-sm text-muted-foreground">Revenue</p>
                        <p className="mt-2 text-2xl font-bold">{formatINR(analytics.summary.totalRevenue)}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
                        <p className="text-sm text-muted-foreground">Orders</p>
                        <p className="mt-2 text-2xl font-bold">{analytics.summary.totalOrders}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
                        <p className="text-sm text-muted-foreground">Average Order Value</p>
                        <p className="mt-2 text-2xl font-bold">{formatINR(analytics.summary.averageOrderValue)}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
                        <p className="text-sm text-muted-foreground">Units Sold</p>
                        <p className="mt-2 text-2xl font-bold">{analytics.summary.totalUnitsSold}</p>
                      </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-3">
                      <div className="rounded-xl border border-border bg-card p-5 shadow-card xl:col-span-2">
                        <h3 className="font-semibold">Revenue Trend</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Last 14 days of revenue and order volume.</p>
                        <div className="mt-4 h-[320px]">
                          <ChartContainer config={revenueChartConfig} className="h-full w-full">
                            <ComposedChart data={analytics.revenueSeries}>
                              <CartesianGrid vertical={false} />
                              <XAxis dataKey="date" tickLine={false} axisLine={false} />
                              <YAxis tickFormatter={(value) => `Rs. ${value}`} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Bar dataKey="orders" fill="var(--color-orders)" radius={8} />
                              <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="var(--color-revenue)"
                                strokeWidth={3}
                                dot={false}
                              />
                            </ComposedChart>
                          </ChartContainer>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
                        <h3 className="font-semibold">Order Status</h3>
                        <p className="mt-1 text-sm text-muted-foreground">Current distribution by fulfillment stage.</p>
                        <div className="mt-4 h-[320px]">
                          <ChartContainer
                            config={{
                              pending: { label: "Pending", color: statusColors[0] },
                              confirmed: { label: "Confirmed", color: statusColors[1] },
                              shipped: { label: "Shipped", color: statusColors[2] },
                              delivered: { label: "Delivered", color: statusColors[3] },
                            }}
                            className="h-full w-full"
                          >
                            <PieChart>
                              <Pie data={analytics.statusSeries} dataKey="count" nameKey="status" innerRadius={65} outerRadius={100}>
                                {analytics.statusSeries.map((entry, index) => (
                                  <Cell key={entry.status} fill={statusColors[index % statusColors.length]} />
                                ))}
                              </Pie>
                              <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
                            </PieChart>
                          </ChartContainer>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-3">
                      <div className="rounded-xl border border-border bg-card p-5 shadow-card xl:col-span-2">
                        <h3 className="font-semibold">Top-Selling Products</h3>
                        <div className="mt-4 space-y-3">
                          {analytics.topProducts.map((product, index) => (
                            <div key={`${product.name}-${index}`} className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3">
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground">{product.unitsSold} units sold</p>
                              </div>
                              <p className="font-semibold">{formatINR(product.revenue)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
                        <h3 className="font-semibold">Payment Mix</h3>
                        <div className="mt-4 h-[260px]">
                          <ChartContainer
                            config={{
                              online: { label: "Online", color: paymentColors[0] },
                              card: { label: "Card", color: paymentColors[1] },
                              cod: { label: "Cash on Delivery", color: paymentColors[2] },
                            }}
                            className="h-full w-full"
                          >
                            <BarChart data={analytics.paymentSeries}>
                              <CartesianGrid vertical={false} />
                              <XAxis dataKey="method" tickLine={false} axisLine={false} />
                              <YAxis allowDecimals={false} />
                              <ChartTooltip content={<ChartTooltipContent />} />
                              <Bar dataKey="count" radius={8}>
                                {analytics.paymentSeries.map((entry, index) => (
                                  <Cell key={entry.method} fill={paymentColors[index % paymentColors.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ChartContainer>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-5 shadow-card">
                      <h3 className="font-semibold">Recent Orders</h3>
                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        {analytics.recentOrders.map((order) => (
                          <div key={order._id} className="rounded-lg bg-secondary/30 p-4">
                            <p className="font-medium">{order.userName}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</p>
                            <p className="mt-3 font-semibold">{formatINR(order.total)}</p>
                            <p className="text-xs uppercase tracking-wide text-muted-foreground">{order.status}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
