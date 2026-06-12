export function defaultOrganizationName(
  fullName?: string | null,
  emailAddress?: string,
  labels?: {
    fallback: string;
    fromName: (name: string) => string;
  },
) {
  const normalizedName = fullName?.trim();

  if (normalizedName) {
    return labels?.fromName(normalizedName) ?? normalizedName;
  }

  const emailName = emailAddress?.split('@')[0]?.trim();
  return emailName
    ? (labels?.fromName(emailName) ?? emailName)
    : (labels?.fallback ?? '');
}
