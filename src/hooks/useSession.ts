import { useState, useCallback } from 'react';
import type { AppState, UsageData, DataSource } from '@/types';
import { calculateMetrics } from '@/lib/calculator';

const INITIAL_STATE: AppState = {
  phase: 'disclosure',
  usageData: null,
  metrics: null,
  showEstimates: true,
  showMethodology: false,
};

/**
 * Ephemeral Session Hook
 *
 * All state lives in React state only.
 * Nothing is persisted to any storage API.
 * The reset function wipes everything back to initial state.
 */
export function useSession() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  const acceptDisclosure = useCallback(() => {
    setState((s) => ({ ...s, phase: 'login' }));
  }, []);

  const setUsageData = useCallback((data: UsageData) => {
    const metrics = calculateMetrics(data.records);
    setState((s) => ({
      ...s,
      phase: 'dashboard',
      usageData: data,
      metrics,
    }));
  }, []);

  const toggleEstimates = useCallback(() => {
    setState((s) => ({ ...s, showEstimates: !s.showEstimates }));
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const goBack = useCallback(() => {
    setState((s) => {
      if (s.phase === 'dashboard') return { ...INITIAL_STATE, phase: 'login' };
      if (s.phase === 'login') return { ...s, phase: 'disclosure' };
      return s;
    });
  }, []);

  return {
    state,
    acceptDisclosure,
    setUsageData,
    toggleEstimates,
    reset,
    goBack,
    source: state.usageData?.source ?? null as DataSource | null,
  };
}
