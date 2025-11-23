"use client";

import React, { type ReactNode } from "react";
import { ThemeProvider } from 'next-themes';
import { SocketProvider } from '@/contexts/SocketContext';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ChakraProvider } from '@chakra-ui/react'; // Import ChakraProvider

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient();

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <ChakraProvider> {/* Wrap children with ChakraProvider */}
            {children}
          </ChakraProvider>
        </SocketProvider>
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
