"use client";

import { Loader2 } from 'lucide-react';
import {
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type ConfirmDialogProps = {
  cancelLabel?: string;
  confirmLabel: string;
  description: ReactNode;
  isPending?: boolean;
  onConfirm: () => Promise<void> | void;
  title: string;
  trigger: ReactNode;
  variant?: 'default' | 'destructive';
};

export function ConfirmDialog({
  cancelLabel = 'Cancel',
  confirmLabel,
  description,
  isPending = false,
  onConfirm,
  title,
  trigger,
  variant = 'default',
}: ConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pending = isPending || isSubmitting;

  async function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AlertDialog
      onOpenChange={(nextOpen) => {
        if (!pending) {
          setOpen(nextOpen);
        }
      }}
      open={open}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => void handleConfirm(event)}
            variant={variant}
          >
            {pending ? (
              <Loader2 aria-hidden="true" className="animate-spin" />
            ) : null}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
