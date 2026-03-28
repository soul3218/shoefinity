import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useShoes } from "@/contexts/ShoeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Smartphone, Truck, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/currency";

type PaymentMethod = "online" | "card" | "cod";

const paymentOptions: { method: PaymentMethod; label: string; icon: React.ReactNode; desc: string }[] = [
  { method: "online", label: "Online Payment", icon: <Smartphone className="h-5 w-5" />, desc: "UPI / Net Banking" },
  { method: "card", label: "Card Payment", icon: <CreditCard className="h-5 w-5" />, desc: "Credit / Debit Card" },
  { method: "cod", label: "Cash on Delivery", icon: <Truck className="h-5 w-5" />, desc: "Pay when delivered" },
];

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const { addOrder } = useShoes();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<PaymentMethod>("card");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [onlineUpiId, setOnlineUpiId] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [pincode, setPincode] = useState("");

  useEffect(() => {
    setPaymentError(null);
  }, [payment]);

  const cardDigits = useMemo(() => cardNumber.replace(/[^\d]/g, ""), [cardNumber]);
  const cvvDigits = useMemo(() => cardCvv.replace(/[^\d]/g, ""), [cardCvv]);

  const paymentIsValid = useMemo(() => {
    if (payment === "cod") return true;
    if (payment === "online") return onlineUpiId.trim().length > 0;

    const nameOk = cardName.trim().length > 0;
    const numberOk = cardDigits.length >= 12 && cardDigits.length <= 19;
    const expiryOk = /^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry.trim());
    const cvvOk = cvvDigits.length === 3 || cvvDigits.length === 4;
    return nameOk && numberOk && expiryOk && cvvOk;
  }, [cardDigits.length, cardExpiry, cardName, cvvDigits.length, onlineUpiId, payment]);

  const getPaymentError = (): string | null => {
    if (payment === "cod") return null;
    if (payment === "online") {
      if (onlineUpiId.trim().length === 0) return "Please enter your UPI ID.";
      return null;
    }

    if (cardName.trim().length === 0) return "Please enter the name on card.";
    if (cardDigits.length < 12 || cardDigits.length > 19) return "Please enter a valid card number.";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry.trim())) return "Please enter expiry as MM/YY.";
    if (!(cvvDigits.length === 3 || cvvDigits.length === 4)) return "Please enter a valid CVV.";
    return null;
  };

  if (!user) return <Navigate to="/login" />;
  if (items.length === 0 && !success) return <Navigate to="/cart" />;

  const handlePay = async () => {
    const err = getPaymentError();
    if (err) {
      setPaymentError(err);
      toast.error(err);
      return;
    }

    setProcessing(true);
    const ok = await addOrder({
      userId: user._id,
      userName: user.name,
      items: [...items],
      total,
      paymentMethod: payment,
      status: "confirmed",
      address: { street, city, state: stateVal, pincode, phone },
    });

    if (!ok) {
      setProcessing(false);
      toast.error("Failed to place order. Is the backend running?");
      return;
    }

    clearCart();
    setProcessing(false);
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

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-10">
        <div className="container mx-auto max-w-2xl px-4">
          <h1 className="font-display text-3xl font-bold">
            <span className="text-gradient">Checkout</span>
          </h1>

          {/* Order Summary */}
          <div className="mt-8 rounded-lg border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold">Order Summary</h2>
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <div key={`${item.shoe._id}-${item.size}`} className="flex justify-between text-sm">
                  <span>
                    {item.shoe.name} (x{item.quantity}) — Size {item.size}
                  </span>
                  <span className="font-medium">{formatINR(item.shoe.price * item.quantity)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-3 flex justify-between font-display font-bold text-lg">
                <span>Total</span>
                <span className="text-gradient">{formatINR(total)}</span>
              </div>
            </div>
          </div>

          {/* Shipping Info */}
          <div className="mt-6 rounded-lg border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold">Shipping Info</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Full Name</Label>
                <Input defaultValue={user.name} readOnly />
              </div>
              <div>
                <Label>Phone</Label>
                <Input placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label>Street Address</Label>
                <Input placeholder="123 Main St" value={street} onChange={(e) => setStreet(e.target.value)} />
              </div>
              <div>
                <Label>City</Label>
                <Input placeholder="Mumbai" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <Label>State</Label>
                <Input placeholder="Maharashtra" value={stateVal} onChange={(e) => setStateVal(e.target.value)} />
              </div>
              <div>
                <Label>Pincode</Label>
                <Input placeholder="400001" value={pincode} onChange={(e) => setPincode(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="mt-6 rounded-lg border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-lg font-semibold">Payment Method</h2>
            <div className="mt-4 space-y-3">
              {paymentOptions.map((opt) => (
                <button
                  key={opt.method}
                  onClick={() => setPayment(opt.method)}
                  className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-all ${
                    payment === opt.method
                      ? "border-primary bg-accent shadow-card-hover"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className={`rounded-full p-2 ${payment === opt.method ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                    {opt.icon}
                  </div>
                  <div>
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            {payment === "online" && (
              <div className="mt-6 grid gap-4">
                <div>
                  <Label htmlFor="upiId">UPI ID</Label>
                  <Input
                    id="upiId"
                    value={onlineUpiId}
                    onChange={(e) => setOnlineUpiId(e.target.value)}
                    placeholder="name@bank"
                    autoComplete="off"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">We use this to initiate an online payment request.</p>
                </div>
              </div>
            )}

            {payment === "card" && (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="cardName">Name on Card</Label>
                  <Input
                    id="cardName"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="John Doe"
                    autoComplete="cc-name"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="1234 5678 9012 3456"
                    autoComplete="cc-number"
                  />
                </div>
                <div>
                  <Label htmlFor="cardExpiry">Expiry (MM/YY)</Label>
                  <Input
                    id="cardExpiry"
                    inputMode="numeric"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="08/29"
                    autoComplete="cc-exp"
                  />
                </div>
                <div>
                  <Label htmlFor="cardCvv">CVV</Label>
                  <Input
                    id="cardCvv"
                    inputMode="numeric"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="123"
                    autoComplete="cc-csc"
                  />
                </div>
              </div>
            )}

            {paymentError && <p className="mt-4 text-sm text-destructive">{paymentError}</p>}
          </div>

          <Button className="mt-8 w-full shadow-button" size="lg" onClick={handlePay} disabled={processing}>
            {processing ? "Processing..." : `Pay Now — ${formatINR(total)}`}
          </Button>
          {!paymentIsValid && <p className="mt-3 text-sm text-muted-foreground">Enter payment details to continue.</p>}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
