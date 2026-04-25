'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { LanguageProvider } from '@/lib/i18n/context'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: 2,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        {children}
      </LanguageProvider>
    </QueryClientProvider>
  )
}
