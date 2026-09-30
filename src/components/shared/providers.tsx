import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  useEffect(() => {
    const markHydrated = () => useAuthStore.getState().setHasHydrated(true);
    const unsub = useAuthStore.persist.onFinishHydration(markHydrated);
    void useAuthStore.persist.rehydrate();
    return unsub;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        {children}
        <Toaster position="top-right" richColors />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
