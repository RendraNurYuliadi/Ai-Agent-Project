export function getImageProxyUrl(source: string): string {
  return `/api/image-preview?url=${encodeURIComponent(source.trim())}`;
}