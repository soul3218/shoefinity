import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useShoes } from "@/contexts/ShoeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Smartphone, TicketPercent, Truck, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/currency";
import { apiJson } from "@/lib/api";
import type { CouponPreview } from "@/types";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const checkoutSchema = z
  .object({
    phone: z.string().min(10, "Enter a valid phone number."),
    street: z.string().min(5, "Enter your street address."),
    city: z.string().min(2, "Enter your city."),
    state: z.string().min(2, "Enter your state."),
    pincode: z.string().min(4, "Enter a valid pincode."),
    paymentMethod: z.enum(["online", "card", "cod"]),
    onlineUpiId: z.string().optional(),
    cardName: z.string().optional(),
    cardNumber: z.string().optional(),
    cardExpiry: z.string().optional(),
    cardCvv: z.string().optional(),
    couponCode: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.paymentMethod === "online" && !values.onlineUpiId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please enter your UPI ID.",
        path: ["onlineUpiId"],
      });
    }

    if (values.paymentMethod === "card") {
      const cardDigits = values.cardNumber?.replace(/[^\d]/g, "") ?? "";
      const cvvDigits = values.cardCvv?.replace(/[^\d]/g, "") ?? "";

      if (!values.cardName?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter the name on card.",
          path: ["cardName"],
        });
      }
      if (cardDigits.length < 12 || cardDigits.length > 19) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid card number.",
          path: ["cardNumber"],
        });
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(values.cardExpiry?.trim() ?? "")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter expiry as MM/YY.",
          path: ["cardExpiry"],
        });
      }
      if (!(cvvDigits.length === 3 || cvvDigits.length === 4)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please enter a valid CVV.",
          path: ["cardCvv"],
        });
      }
    }
  });

type CheckoutValues = z.infer<typeof checkoutSchema>;
type PaymentMethod = CheckoutValues["paymentMethod"];

const paymentOptions: { method: PaymentMethod; label: string; icon: React.ReactNode; desc: string }[] = [
  { method: "online", label: "Online Payment", icon: <Smartphone className="h-5 w-5" />, desc: "UPI / Net Banking" },
  { method: "card", label: "Card Payment", icon: <CreditCard className="h-5 w-5" />, desc: "Credit / Debit Card" },
  { method: "cod", label: "Cash on Delivery", icon: <Truck className="h-5 w-5" />, desc: "Pay when delivered" },
];

const Checkout = () => {
  const { items, total, clearCart, isSyncing } = useCart();
  const { user } = useAuth();
  const { addOrder } = useShoes();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [appliedCouponCode, setAppliedCouponCode] = useState("");
  const form = useForm<CheckoutValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      phone: "",
      street: "",
      city: "",
      state: "",
      pincode: "",
      paymentMethod: "card",
      onlineUpiId: "",
      cardName: "",
      cardNumber: "",
      cardExpiry: "",
      cardCvv: "",
      couponCode: "",
    },
  });

  const paymentMethod = useWatch({ control: form.control, name: "paymentMethod" });
  const couponCode = useWatch({ control: form.control, name: "couponCode" });

  const couponMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiJson<CouponPreview>(
        `/api/coupons/validate?code=${encodeURIComponent(code)}&subtotal=${encodeURIComponent(total)}`,
        { method: "GET" }
      );
      if (!res.ok || typeof res.data?.valid !== "boolean") {
        throw new Error("Could not validate coupon");
      }
      return res.data;
    },
  });

  useEffect(() => {
    if (!appliedCouponCode) return;
    couponMutation.mutate(appliedCouponCode);
  }, [appliedCouponCode, couponMutation, total]);

  const appliedCoupon =
    couponMutation.data?.valid && couponMutation.data.code === appliedCouponCode ? couponMutation.data : null;
  const discount = appliedCoupon?.discount ?? 0;
  const payableTotal = useMemo(() => Number((total - discount).toFixed(2)), [discount, total]);

  const handleApplyCoupon = async () => {
    const code = (couponCode ?? "").trim();
    if (!code) {
      toast.error("Enter a promo code first.");
      return;
    }

    try {
      const preview = await couponMutation.mutateAsync(code);
      if (!preview.valid) {
        setAppliedCouponCode("");
        toast.error(preview.message);
        return;
      }

      setAppliedCouponCode(preview.code);
      toast.success(preview.message);
    } catch {
      setAppliedCouponCode("");
      toast.error("Couldn't validate the promo code.");
    }
  };

  const clearCoupon = () => {
    setAppliedCouponCode("");
    couponMutation.reset();
    form.setValue("couponCode", "");
  };

  const handleCheckout = async (values: CheckoutValues) => {
    const ok = await addOrder({
      userId: user!._id,
      userName: user!.name,
      items: [...items],
      subtotal: total,
      discount,
      total: payableTotal,
      couponCode: appliedCoupon?.code,
      paymentMethod: values.paymentMethod,
      status: "confirmed",
      address: {
        street: values.street,
        city: values.city,
        state: values.state,
        pincode: values.pincode,
        phone: values.phone,
      },
    });

    if (!ok) {
      toast.error("Failed to place order. Please check the backend and try again.");
      return;
    }

    clearCart();
    setSuccess(true);
    toast.success("Payment successful!");
  };

  if (success) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="text-center animate-scale-in">
            <CheckCircle className="mx-auto h-20 w-20 text-success" />
            <h1 className="mt-6 font-display text-3xl font-bold">Payment Successful!</h1>
            <p className="mt-3 text-muted-foreground">Your order has been placed. Thank you for shopping with ShoeFinity!</p>
            <Button className="mt-8 shadow-button" onClick={() => navigate("/shop")}>
              Continue Shopping
            </Button>
          </div>
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="rounded-xl border border-border bg-card p-8 text-center shadow-card">
            <h1 className="text-2xl font-semibold">Your cart is empty</h1>
            <p className="mt-2 text-sm text-muted-foreground">Add a few shoes before heading to checkout.</p>
            <Button className="mt-6" onClick={() => navigate("/shop")}>
              Continue Shopping
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-10">
        <div className="container mx-auto max-w-3xl px-4">
          <h1 className="font-display text-3xl font-bold">
            <span className="text-gradient">Checkout</span>
          </h1>

          <div className="mt-8 rounded-lg border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold">Order Summary</h2>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={`${item.shoe._id}-${item.size}`} className="flex justify-between text-sm">
                  <span>
                    {item.shoe.name} (x{item.quantity}) - Size {item.size}
                  </span>
                  <span className="font-medium">
                    {formatINR((item.unitPrice ?? item.shoe.price) * item.quantity)}
                  </span>
                </div>
              ))}

              <div className="border-t border-border pt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatINR(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span className="text-success">-{formatINR(discount)}</span>
                </div>
                <div className="flex justify-between font-display font-bold text-lg">
                  <span>Total</span>
                  <span className="text-gradient">{formatINR(payableTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCheckout)} className="space-y-6">
              <div className="mt-6 rounded-lg border border-border bg-card p-6 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold">Promo Code</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Try `WELCOME10`, `RUN500`, or `FREESTEP`.</p>
                  </div>
                  {appliedCoupon && (
                    <Button type="button" variant="ghost" size="sm" onClick={clearCoupon}>
                      Remove
                    </Button>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <FormField
                    control={form.control}
                    name="couponCode"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <div className="relative">
                            <TicketPercent className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="Enter promo code" className="pl-9" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="sm:w-auto"
                    onClick={handleApplyCoupon}
                    disabled={couponMutation.isPending}
                  >
                    {couponMutation.isPending ? "Applying..." : "Apply Code"}
                  </Button>
                </div>

                {couponMutation.data?.message && (
                  <p className={`mt-3 text-sm ${appliedCoupon ? "text-success" : "text-muted-foreground"}`}>
                    {couponMutation.data.message}
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-border bg-card p-6 shadow-card">
                <h2 className="font-display text-lg font-semibold">Shipping Info</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <FormLabel>Full Name</FormLabel>
                    <Input value={user?.name ?? ""} readOnly />
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+91 98765 43210" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Mumbai" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="Maharashtra" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode</FormLabel>
                        <FormControl>
                          <Input placeholder="400001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-6 shadow-card">
                <h2 className="font-display text-lg font-semibold">Payment Method</h2>
                <div className="mt-4 space-y-3">
                  {paymentOptions.map((option) => (
                    <button
                      key={option.method}
                      type="button"
                      onClick={() => form.setValue("paymentMethod", option.method, { shouldValidate: true })}
                      className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all ${
                        paymentMethod === option.method
                          ? "border-primary bg-accent shadow-card-hover"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <div
                        className={`rounded-full p-2 ${
                          paymentMethod === option.method ? "bg-primary text-primary-foreground" : "bg-secondary"
                        }`}
                      >
                        {option.icon}
                      </div>
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {paymentMethod === "online" && (
                  <div className="mt-6">
                    <FormField
                      control={form.control}
                      name="onlineUpiId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>UPI ID</FormLabel>
                          <FormControl>
                            <Input placeholder="name@bank" autoComplete="off" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {paymentMethod === "card" && (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="cardName"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Name on Card</FormLabel>
                          <FormControl>
                            <Input autoComplete="cc-name" placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cardNumber"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                          <FormLabel>Card Number</FormLabel>
                          <FormControl>
                            <Input inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cardExpiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expiry (MM/YY)</FormLabel>
                          <FormControl>
                            <Input inputMode="numeric" autoComplete="cc-exp" placeholder="08/29" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="cardCvv"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CVV</FormLabel>
                          <FormControl>
                            <Input inputMode="numeric" autoComplete="cc-csc" placeholder="123" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              <Button className="w-full shadow-button" size="lg" type="submit" disabled={form.formState.isSubmitting || isSyncing}>
                {form.formState.isSubmitting ? "Processing..." : `Pay Now - ${formatINR(payableTotal)}`}
              </Button>
            </form>
          </Form>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
