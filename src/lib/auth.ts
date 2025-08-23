import { useQuery } from "@tanstack/react-query";
import type { User } from "../../shared/schema.ts";

interface AuthResponse {
  user: User;
}

export function useAuth() {
  const { data, isLoading, error } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: false,
    queryFn: async () => {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
      });
      
      if (res.status === 401) {
        return null;
      }
      
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      
      return await res.json();
    },
  });

  return {
    user: data?.user || null,
    isLoading,
    isAuthenticated: !!data?.user,
    error,
  };
}
