"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes fresh
            gcTime: 1000 * 60 * 30, // 30 minutes in memory
            refetchOnWindowFocus: false,
            retry: (failureCount, error: unknown) => {
              if (error && typeof error === "object" && "status" in error && error.status === 404) return false;
              return failureCount < 2;
            },
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export default QueryProvider;
