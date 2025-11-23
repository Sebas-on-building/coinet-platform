import React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface FormFieldProps {
  label: string;
  id: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ 
  label, 
  id, 
  error, 
  hint, 
  required, 
  children, 
  className 
}: FormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [
    hint ? hintId : '',
    error ? errorId : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={cn("space-y-2", className)}>
      <Label 
        htmlFor={id}
        className="flex items-center gap-1"
      >
        {label}
        {required && (
          <span className="text-destructive" aria-label="required">
            *
          </span>
        )}
      </Label>
      
      {hint && (
        <p 
          id={hintId} 
          className="text-sm text-muted-foreground"
        >
          {hint}
        </p>
      )}

      {React.cloneElement(children as React.ReactElement, {
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? 'true' : 'false',
        'aria-required': required ? 'true' : 'false',
        className: cn(
          (children as React.ReactElement).props.className,
          error && 'border-destructive focus-visible:ring-destructive'
        )
      })}

      {error && (
        <div 
          id={errorId}
          className="flex items-center gap-2 text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

interface AccessibleInputProps extends React.ComponentPropsWithoutRef<typeof Input> {
  label: string;
  error?: string;
  hint?: string;
}

export function AccessibleInput({ 
  label, 
  error, 
  hint, 
  required,
  id,
  className,
  ...props 
}: AccessibleInputProps) {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <FormField 
      label={label} 
      id={inputId} 
      error={error} 
      hint={hint} 
      required={required}
      className={className}
    >
      <Input {...props} />
    </FormField>
  );
}

interface AccessibleTextareaProps extends React.ComponentPropsWithoutRef<typeof Textarea> {
  label: string;
  error?: string;
  hint?: string;
}

export function AccessibleTextarea({ 
  label, 
  error, 
  hint, 
  required,
  id,
  className,
  ...props 
}: AccessibleTextareaProps) {
  const textareaId = id || `textarea-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <FormField 
      label={label} 
      id={textareaId} 
      error={error} 
      hint={hint} 
      required={required}
      className={className}
    >
      <Textarea {...props} />
    </FormField>
  );
}

interface FormSuccessProps {
  message: string;
  className?: string;
}

export function FormSuccess({ message, className }: FormSuccessProps) {
  return (
    <div 
      className={cn(
        "flex items-center gap-2 text-sm text-green-600 dark:text-green-400",
        "p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

interface FormErrorSummaryProps {
  errors: Array<{ field: string; message: string }>;
  className?: string;
}

export function FormErrorSummary({ errors, className }: FormErrorSummaryProps) {
  if (errors.length === 0) return null;

  return (
    <div 
      className={cn(
        "p-4 rounded-lg bg-destructive/10 border border-destructive/30",
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <h3 className="font-semibold text-destructive mb-2 flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        {errors.length === 1 ? 'There is 1 error' : `There are ${errors.length} errors`}
      </h3>
      <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
        {errors.map((error, index) => (
          <li key={index}>
            <strong>{error.field}:</strong> {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
