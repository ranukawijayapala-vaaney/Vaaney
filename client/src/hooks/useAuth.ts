// Referenced from javascript_log_in_with_replit blueprint
// Fixed: Returns null for 401 responses to allow guest browsing - v2
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

// Custom queryFn that returns null for 401 responses (for guest users)
async function fetchCurrentUser(): Promise<User | null> {
  const res = await fetch("/api/user", {
    credentials: "include",
  });

  // For unauthenticated users, return null instead of throwing
  if (res.status === 401) {
    return null;
  }

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return await res.json();
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: fetchCurrentUser,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
  };
}
