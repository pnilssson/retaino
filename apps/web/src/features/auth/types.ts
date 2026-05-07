export type AuthStep = 'email' | 'code' | 'requirements';

export type AuthField = 'email' | 'code' | 'form' | 'requirements';

export type AuthError = {
  field: AuthField;
  message: string;
};
