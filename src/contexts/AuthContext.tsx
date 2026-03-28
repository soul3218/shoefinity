import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/types";
import { apiJson } from "@/lib/api";

interface AuthResponse {
  token: string;
  user: User;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  signup: (name: string, email: string, password: string) => Promise<User | null>;
  logout: () => void;
  isAdmin: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getStoredSession() {
  const token = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  if (!token) return { token: null, user: null as User | null };

  try {
    return {
      token,
      user: storedUser ? (JSON.parse(storedUser) as User) : null,
    };
  } catch {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    return { token: null, user: null as User | null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const initialSession = useMemo(getStoredSession, []);
  const [token, setToken] = useState<string | null>(initialSession.token);

  const meQuery = useQuery({
    queryKey: ["auth", "me", token],
    enabled: Boolean(token),
    retry: false,
    staleTime: 5 * 60 * 1000,
    initialData: initialSession.user ?? undefined,
    queryFn: async () => {
      const res = await apiJson<User>("/api/auth/me", {
        method: "GET",
        token: token ?? undefined,
      });
      if (!res.ok || !res.data?._id) throw new Error("Authentication failed");
      return res.data;
    },
  });

  const persistSession = useCallback(
    (nextToken: string, nextUser: User) => {
      localStorage.setItem("token", nextToken);
      localStorage.setItem("user", JSON.stringify(nextUser));
      setToken(nextToken);
      queryClient.setQueryData(["auth", "me", nextToken], nextUser);
    },
    [queryClient]
  );

  const clearSession = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    queryClient.removeQueries({ queryKey: ["auth"] });
    queryClient.removeQueries({ queryKey: ["orders"] });
    queryClient.removeQueries({ queryKey: ["cart"] });
    queryClient.removeQueries({ queryKey: ["wishlist"] });
    queryClient.removeQueries({ queryKey: ["analytics"] });
  }, [queryClient]);

  useEffect(() => {
    if (meQuery.data && token) {
      localStorage.setItem("user", JSON.stringify(meQuery.data));
    }
  }, [meQuery.data, token]);

  useEffect(() => {
    if (meQuery.isError && token) {
      clearSession();
    }
  }, [clearSession, meQuery.isError, token]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const res = await apiJson<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok || !res.data?.token || !res.data?.user) {
        throw new Error(res.data?.message || "Login failed");
      }
      return res.data;
    },
    onSuccess: (data) => {
      persistSession(data.token, data.user);
    },
  });

  const signupMutation = useMutation({
    mutationFn: async ({ name, email, password }: { name: string; email: string; password: string }) => {
      const res = await apiJson<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok || !res.data?.token || !res.data?.user) {
        throw new Error(res.data?.message || "Signup failed");
      }
      return res.data;
    },
    onSuccess: (data) => {
      persistSession(data.token, data.user);
    },
  });

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const result = await loginMutation.mutateAsync({ email, password });
        return { ...result.user, token: result.token };
      } catch {
        return null;
      }
    },
    [loginMutation]
  );

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        const result = await signupMutation.mutateAsync({ name, email, password });
        return { ...result.user, token: result.token };
      } catch {
        return null;
      }
    },
    [signupMutation]
  );

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const user = token && meQuery.data ? { ...meQuery.data, token } : null;
  const isLoading =
    loginMutation.isPending ||
    signupMutation.isPending ||
    (Boolean(token) && meQuery.fetchStatus === "fetching" && !meQuery.data);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAdmin: user?.role === "admin", isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
