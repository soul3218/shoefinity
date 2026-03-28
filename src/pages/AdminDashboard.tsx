import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useShoes } from "@/contexts/ShoeContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Package, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { Shoe } from "@/types";
import { formatINR } from "@/lib/currency";

const emptyShoe = {
  name: "",
  price: 0,
  image: "",
  description: "",
  category: "",
  sizes: [7, 8, 9, 10, 11],
  inStock: true,
};

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const { shoes, orders, addShoe, updateShoe, deleteShoe } = useShoes();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Shoe, "_id">>(emptyShoe);
  const [showForm, setShowForm] = useState(false);

  if (!user) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/shop" />;

  const handleSave = async () => {
    if (!form.name || !form.price) {
      toast.error("Name and price are required");
      return;
    }

    if (editingId) {
      const ok = await updateShoe(editingId, form);
      if (!ok) return toast.error("Update failed");
      toast.success("Updated");
    } else {
      const ok = await addShoe(form);
      if (!ok) return toast.error("Add failed");
      toast.success("Added");
    }

    setForm(emptyShoe);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (shoe: Shoe) => {
    setForm({
      name: shoe.name,
      price: shoe.price,
      image: shoe.image,
      description: shoe.description,
      category: shoe.category,
      sizes: shoe.sizes,
      inStock: shoe.inStock,
    });
    setEditingId(shoe._id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteShoe(id);
    if (!ok) return toast.error("Delete failed");
    toast.success("Deleted");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1 py-10">
        <div className="container mx-auto px-4">

          {/* HEADER */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">
              Admin <span className="text-gradient">Dashboard</span>
            </h1>

            <Button
              onClick={() => {
                setShowForm(!showForm);
                setEditingId(null);
                setForm(emptyShoe);
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Shoe
            </Button>
          </div>

          {/* FORM */}
          {showForm && (
            <div className="mt-6 rounded-lg border bg-card p-6 shadow-card">
              <h2 className="text-lg font-semibold">
                {editingId ? "Edit Shoe" : "Add Shoe"}
              </h2>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) =>
                      setForm({ ...form, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: Number(e.target.value) })
                    }
                  />
                </div>

                <div>
                  <Label>Category</Label>
                  <Input
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label>Image</Label>
                  <Input
                    value={form.image}
                    onChange={(e) =>
                      setForm({ ...form, image: e.target.value })
                    }
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label>Sizes</Label>
                  <Input
                    value={form.sizes.join(", ")}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sizes: e.target.value
                          .split(",")
                          .map((s) => Number(s.trim()))
                          .filter(Boolean),
                      })
                    }
                  />
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <Button onClick={handleSave}>
                  {editingId ? "Update" : "Add"}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* TABS */}
          <Tabs defaultValue="products" className="mt-8">
            <TabsList>
              <TabsTrigger value="products">
                <Package className="mr-1 h-4 w-4" />
                Products ({shoes.length})
              </TabsTrigger>

              <TabsTrigger value="orders">
                <ShoppingBag className="mr-1 h-4 w-4" />
                Orders ({orders.length})
              </TabsTrigger>
            </TabsList>

            {/* PRODUCTS */}
            <TabsContent value="products">
              <div className="mt-4 space-y-3">
                {shoes.map((shoe) => (
                  <div
                    key={shoe._id}
                    className="flex items-center gap-4 border p-4 rounded-lg"
                  >
                    <img
                      src={shoe.image}
                      className="h-16 w-16 object-contain"
                    />

                    <div className="flex-1">
                      <h3 className="font-semibold">{shoe.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {shoe.category} — {formatINR(shoe.price)}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleEdit(shoe)}>
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(shoe._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ORDERS */}
            <TabsContent value="orders">
              <div className="mt-4 space-y-4">

                {orders.length === 0 && (
                  <p className="text-center text-muted-foreground">
                    No orders yet
                  </p>
                )}

                {orders.map((order) => (
                  <div
                    key={order._id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    {/* TOP */}
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {order.userName}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold">
                          {formatINR(order.total)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.paymentMethod} — {order.status}
                        </p>
                      </div>
                    </div>

                    {/* ADDRESS */}
                    <div className="text-sm">
                      <p className="font-medium">Address:</p>
                      <p>{order.address?.street || "N/A"}</p>
                      <p>
                        {order.address?.city || ""},{" "}
                        {order.address?.state || ""} -{" "}
                        {order.address?.pincode || ""}
                      </p>
                      {order.address?.phone && <p className="text-muted-foreground">Phone: {order.address.phone}</p>}
                    </div>

                    {/* ITEMS */}
                    <div className="text-sm text-muted-foreground">
                      {order.items.map((item, i) => (
                        <p key={i}>
                          {item.shoe?.name} x{item.quantity} (Size {item.size})
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;