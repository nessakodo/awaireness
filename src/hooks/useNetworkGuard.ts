import { useEffect, useRef, useCallback } from 'react';
import type { DataSource } from '@/types';

/**
 * Network Guard Hook
 *
 * In modes A (import) and C (demo), no network requests should occur.
 * This hook patches fetch and XMLHttpRequest to warn on unexpected calls.
 */
export function useNetworkGuard(source: DataSource | null) {
  const originalFetch = useRef<typeof fetch | null>(null);
  const warningsRef = useRef<string[]>([]);

  useEffect(() => {
    // Only guard in import and demo modes
    if (source !== 'import' && source !== 'demo') return;

    originalFetch.current = window.fetch;

    window.fetch = ((...args: Parameters<typeof fetch>) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || 'unknown';
      const msg = `[Awaireness] Unexpected network request blocked in ${source} mode: ${url}`;
      console.warn(msg);
      warningsRef.current.push(msg);
      return Promise.reject(new Error(msg));
    }) as typeof fetch;

    // Patch XHR open
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async_?: boolean,
      username?: string | null,
      password?: string | null,
    ) {
      const msg = `[Awaireness] Unexpected XHR blocked in ${source} mode: ${method} ${url}`;
      console.warn(msg);
      warningsRef.current.push(msg);
      return origOpen.call(this, method, url, async_ ?? true, username ?? null, password ?? null);
    };

    return () => {
      if (originalFetch.current) {
        window.fetch = originalFetch.current;
      }
      XMLHttpRequest.prototype.open = origOpen;
      warningsRef.current = [];
    };
  }, [source]);

  const getWarnings = useCallback(() => [...warningsRef.current], []);

  return { getWarnings };
}
