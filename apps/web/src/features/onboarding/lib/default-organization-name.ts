export function defaultOrganizationName(
  fullName?: string | null,
  emailAddress?: string,
) {
  const normalizedName = fullName?.trim();

  if (normalizedName) {
    return `${normalizedName}'s organization`;
  }

  const emailName = emailAddress?.split('@')[0]?.trim();
  return emailName ? `${emailName}'s organization` : 'My organization';
}
