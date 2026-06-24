export function dateOnlyToUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
