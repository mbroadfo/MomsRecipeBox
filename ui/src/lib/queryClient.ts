import { QueryClient } from '@tanstack/react-query';
import { config, devLog } from '../config/environment.js';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: config.isProduction ? 3 : 1, // More retries in production
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: !config.enableDevTools, // Less aggressive in development
      // Longer cache time for production
      gcTime: config.isProduction ? 10 * 60 * 1000 : 5 * 60 * 1000,
    },
    mutations: {
      retry: config.isProduction ? 2 : 1,
      onError: (error) => {
        devLog('Mutation error:', error);
      },
    },
  },
});

// Log QueryClient configuration in development
devLog('QueryClient configured for environment:', config.environment);
