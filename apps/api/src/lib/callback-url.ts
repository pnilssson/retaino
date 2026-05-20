export function callbackUrl(baseUrl: string | undefined, path: string) {
  if (!baseUrl) {
    return null;
  }

  return `${baseUrl.replace(/\/$/, '')}${path}`;
}
