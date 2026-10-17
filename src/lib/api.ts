export type DataSource = 'live' | 'snapshot' | 'simulated';
export type ApiResult<T> = { data: T; source: DataSource };

export async function getApi<T>(path: string): Promise<ApiResult<T>> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return {
    data: await response.json() as T,
    source: (response.headers.get('x-ellie-source') as DataSource | null) ?? 'live',
  };
}

export async function postApi<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json() as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}
