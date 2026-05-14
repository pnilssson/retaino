export function initialsFor(value: string | null | undefined, fallback: string) {
  if (!value) {
    return fallback;
  }

  const [first = '', second = ''] = value.trim().split(/\s+/);
  const initials = `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase();

  return initials || fallback;
}
