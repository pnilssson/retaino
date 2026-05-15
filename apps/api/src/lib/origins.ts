const localFrontendOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
] as const;

export function parseConfiguredOrigins(value: string | undefined) {
  return value
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? [];
}

export function allowedBrowserOrigins(appAllowedOrigins: string | undefined) {
  const configuredOrigins = parseConfiguredOrigins(appAllowedOrigins);

  if (configuredOrigins.length > 0) {
    return Array.from(new Set(configuredOrigins));
  }

  return [...localFrontendOrigins];
}
