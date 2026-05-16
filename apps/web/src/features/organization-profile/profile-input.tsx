import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { textStyles } from '@/lib/text-styles';
import type { OrganizationProfileFormValues } from './organization-profile-form';

export function ProfileInput({
  error,
  label,
  name,
  onBlur,
  onChange,
  placeholder,
  type = 'text',
  value,
}: {
  error: string | null;
  label: string;
  name: keyof OrganizationProfileFormValues;
  onBlur: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        aria-describedby={error ? `${name}-error` : undefined}
        aria-invalid={Boolean(error)}
        autoComplete="off"
        id={name}
        name={name}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
      {error ? (
        <p className={textStyles.error} id={`${name}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
