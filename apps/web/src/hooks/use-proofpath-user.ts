"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

export interface ProofPathUser {
  id: string;
  clerk_id: string;
  institution_id: string | null;
  role: "admin" | "teacher" | "student";
  email: string;
  name: string | null;
}

export function useProofPathUser(): {
  proofpathUser: ProofPathUser | null;
  clerkUser: ReturnType<typeof useUser>["user"];
  isLoading: boolean;
  sync: (role?: string) => void;
  syncAsync: (role?: string) => Promise<ProofPathUser>;
  needsSync: boolean;
} {
  const { getToken, isSignedIn } = useAuth();
  const { user: clerkUser } = useUser();
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async (role?: string) => {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      return apiFetch<ProofPathUser>("/api/users/sync", {
        method: "POST",
        token,
        body: JSON.stringify({
          role: role ?? undefined,
          institution_domain: "demo.proofpath.edu.au",
        }),
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["proofpath-user"], data);
    },
  });

  const userQuery = useQuery({
    queryKey: ["proofpath-user"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return null;
      try {
        return await apiFetch<ProofPathUser>("/api/users/me", { token });
      } catch {
        return null;
      }
    },
    enabled: !!isSignedIn,
  });

  const proofpathUser = userQuery.data ?? syncMutation.data ?? null;

  return {
    proofpathUser,
    clerkUser,
    isLoading: userQuery.isLoading || syncMutation.isPending,
    sync: syncMutation.mutate,
    syncAsync: syncMutation.mutateAsync,
    needsSync: !!(isSignedIn && !proofpathUser && !userQuery.isLoading),
  };
}
