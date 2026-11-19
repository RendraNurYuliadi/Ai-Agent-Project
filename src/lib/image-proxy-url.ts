export function getImageProxyUrl(source: string, accessToken?: string): string {
  const params = new URLSearchParams({ url: source.trim() });
  if (accessToken) params.set("token", accessToken);
  return `/api/image-preview?${params.toString()}`;
}