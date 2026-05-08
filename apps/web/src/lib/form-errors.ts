export function getFieldError(errors: unknown[]) {
  return errors[0] ? String(errors[0]) : null;
}
