"use client";

import { CalendarIcon, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function DatePickerInput({
  'aria-invalid': ariaInvalid,
  id,
  name,
  onBlur,
  onChange,
  placeholder = 'Select date',
  value,
}: {
  'aria-invalid'?: boolean;
  id?: string;
  name?: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = dateInputToLocalDate(value);

  return (
    <Popover
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (!nextOpen) {
          onBlur?.();
        }
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button
          aria-invalid={ariaInvalid}
          aria-label={placeholder}
          className="h-8 w-full justify-start"
          id={id}
          name={name}
          type="button"
          variant="outline"
        >
          <CalendarIcon aria-hidden="true" data-icon="inline-start" />
          {selectedDate ? formatDateInputLabel(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          captionLayout="dropdown"
          mode="single"
          onSelect={(date) => {
            onChange(date ? localDateToDateInput(date) : '');
            setOpen(false);
          }}
          selected={selectedDate}
        />
        {selectedDate ? (
          <div className="flex justify-end border-t p-2">
            <Button
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" data-icon="inline-start" />
              Clear
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function dateInputToLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function localDateToDateInput(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateInputLabel(value: string) {
  const date = dateInputToLocalDate(value);

  if (!date) {
    return 'Select date';
  }

  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
}
