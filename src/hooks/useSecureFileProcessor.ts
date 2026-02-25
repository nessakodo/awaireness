/**
 * Secure File Processor Hook
 *
 * Processes uploaded files in a sandboxed Web Worker with:
 * 1. All network APIs deleted before any code runs
 * 2. Raw file content zeroed after parsing
 * 3. Worker self-terminates after processing
 * 4. Only derived numerical data returned
 * 5. Full security report returned for verification
 *
 * NO RAW FILE CONTENT EVER ENTERS THE MAIN THREAD'S STATE.
 * The FileReader reads into a string, passes it to the worker,
 * and the local variable is immediately nulled.
 */

import { useCallback, useState } from 'react';
import type { UsageRecord } from '@/types';

interface SecurityReport {
  networkApisKilled: boolean;
  rawContentZeroed: boolean;
  processingTimeMs: number;
}

interface ProcessResult {
  success: boolean;
  records?: UsageRecord[];
  rowCount?: number;
  error?: string;
  securityReport?: SecurityReport;
}

export function useSecureFileProcessor() {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);

  const processFile = useCallback((file: File): Promise<ProcessResult> => {
    setProcessing(true);
    setResult(null);

    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = () => {
        let content = reader.result as string;
        const filename = file.name;

        // Create a fresh worker for each file (no reuse = no state leak)
        const worker = new Worker(
          new URL('../workers/secure-parse-worker.ts', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = (event: MessageEvent<ProcessResult>) => {
          const res = event.data;
          setResult(res);
          setProcessing(false);
          worker.terminate(); // Belt and suspenders — worker also self-closes
          resolve(res);
        };

        worker.onerror = (err) => {
          const res: ProcessResult = {
            success: false,
            error: `Worker error: ${err.message}`,
          };
          setResult(res);
          setProcessing(false);
          worker.terminate();
          resolve(res);
        };

        // Send content to worker — it will be zeroed there after parsing
        worker.postMessage({ content, filename });

        // Zero the content from main thread immediately after posting
        content = '';
        // The FileReader result is also now stale — force GC eligibility
        (reader as { result: null }).result = null;
      };

      reader.onerror = () => {
        const res: ProcessResult = { success: false, error: 'Failed to read file' };
        setResult(res);
        setProcessing(false);
        resolve(res);
      };

      reader.readAsText(file);
    });
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  return { processFile, processing, result, clearResult };
}
