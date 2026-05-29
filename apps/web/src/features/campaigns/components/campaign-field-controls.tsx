"use client";

import type {
  InputHTMLAttributes,
  Ref,
} from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { textStyles } from '@/lib/text-styles';
import { cn } from '@/lib/utils';

export function CampaignTextInput({
  autoComplete = 'off',
  disabled,
  error,
  inputMode,
  label,
  name,
  onBlur,
  onChange,
  placeholder,
  spellCheck,
  type = 'text',
  value,
}: {
  autoComplete?: string;
  disabled: boolean;
  error: string | null;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  label: string;
  name: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  spellCheck?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        aria-invalid={Boolean(error)}
        autoComplete={autoComplete}
        disabled={disabled}
        id={name}
        inputMode={inputMode}
        name={name}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        spellCheck={spellCheck}
        type={type}
        value={value}
      />
      {error ? (
        <p aria-live="polite" className={textStyles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CampaignTextAreaInput({
  disabled,
  error,
  label,
  name,
  onBlur,
  onChange,
  placeholder,
  textAreaRef,
  value,
}: {
  disabled: boolean;
  error: string | null;
  label: string;
  name: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  textAreaRef?: Ref<HTMLTextAreaElement>;
  value: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <textarea
        aria-invalid={Boolean(error)}
        autoComplete="off"
        className={cn(
          'min-h-36 w-full resize-y rounded-lg border border-input bg-transparent px-2.5 py-2 transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30',
          textStyles.body,
        )}
        disabled={disabled}
        id={name}
        name={name}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        ref={textAreaRef}
        value={value}
      />
      {error ? (
        <p aria-live="polite" className={textStyles.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
