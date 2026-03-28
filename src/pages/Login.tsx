import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type LoginValues = z.infer<typeof loginSchema>;

const Login = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = async (values: LoginValues) => {
    const loggedInUser = await login(values.email, values.password);
    if (!loggedInUser) {
      toast.error("Invalid email or password");
      return;
    }

    toast.success("Welcome back!");
    const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    const nextPath = loggedInUser.role === "admin" ? "/admin" : fromPath && fromPath !== "/admin" ? fromPath : "/shop";
    navigate(nextPath, { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="w-full max-w-md animate-scale-in rounded-lg border border-border bg-card p-8 shadow-card">
          <h1 className="text-center font-display text-2xl font-bold">Welcome Back</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">Sign in to your account</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="mt-6 space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full shadow-button" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>

          <div className="mt-6 rounded-md bg-accent p-3 text-xs text-accent-foreground">
            <p className="font-semibold">Demo credentials:</p>
            <p>Admin: admin@kicks.com / admin123</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;
