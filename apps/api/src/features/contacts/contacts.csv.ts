const SENSITIVE_CSV_HEADER_PATTERNS = [
  /health/i,
  /journal/i,
  /medical/i,
  /treatment note/i,
];

export function isSensitiveCsvHeader(header: string) {
  return SENSITIVE_CSV_HEADER_PATTERNS.some((pattern) => pattern.test(header));
}

export function csvSensitiveHeaderWarnings(headers: string[]) {
  return headers
    .filter(isSensitiveCsvHeader)
    .map((header) => `Unsupported sensitive column ignored: ${header}`);
}

export function csvAllowedHeaders(headers: string[]) {
  return headers.filter((header) => !isSensitiveCsvHeader(header));
}

export function csvAllowedMappedHeaders(mapping: Record<string, string | undefined>) {
  return Array.from(new Set(Object.values(mapping)))
    .filter((header): header is string => Boolean(header))
    .filter((header) => !isSensitiveCsvHeader(header));
}

export function csvRowForHeaders(
  row: Record<string, string>,
  headers: string[],
) {
  return Object.fromEntries(
    headers
      .filter((header) => Object.hasOwn(row, header))
      .map((header) => [header, row[header] ?? '']),
  );
}

export function csvValuesForHeaders(
  allHeaders: string[],
  values: string[],
  allowedHeaders: string[],
) {
  const allowed = new Set(allowedHeaders);

  return Object.fromEntries(
    allHeaders
      .map((header, index) => [header, values[index] ?? ''] as const)
      .filter(([header]) => allowed.has(header)),
  );
}
