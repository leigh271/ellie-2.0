import { useCallback, useEffect, useState } from 'react';
import { getApi } from './api';
import type { ApiResult, DataSource } from './api';

export function useRemote<T>(path: string) {
  const [result, setResult] = useState<ApiResult<T> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    getApi<T>(path).then(setResult).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to load data.')).finally(() => setLoading(false));
  }, [path]);
  useEffect(() => { reload(); }, [reload]);
  return { data: result?.data ?? null, source: (result?.source ?? 'simulated') as DataSource, loading, error, reload };
}
