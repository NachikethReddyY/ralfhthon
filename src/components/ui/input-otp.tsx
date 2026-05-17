import * as React from 'react';
import { OTPInput, OTPInputContext, type OTPInputProps } from 'input-otp';
import { cn } from '../../lib/utils';

function InputOTP({
  className,
  containerClassName,
  ...props
}: OTPInputProps & { containerClassName?: string }) {
  return (
    <OTPInput
      data-slot="input-otp"
      containerClassName={cn(
        'flex items-center gap-3 disabled:opacity-50 has-disabled:opacity-50',
        containerClassName
      )}
      className={cn('disabled:cursor-not-allowed', className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="input-otp-group" className={cn('flex items-center gap-3', className)} {...props} />;
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<'div'> & { index: number }) {
  const inputOTPContext = React.useContext(OTPInputContext);
  const slot = inputOTPContext.slots[index];

  return (
    <div
      data-slot="input-otp-slot"
      className={cn(
        'relative flex h-14 w-12 items-center justify-center rounded-lg border border-[var(--color-hairline-strong)] bg-[var(--color-surface-card)] text-lg font-semibold text-[var(--color-ink)] transition-all',
        slot.isActive && 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/10',
        className
      )}
      {...props}
    >
      {slot.char ?? slot.placeholderChar}
      {slot.hasFakeCaret ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-pulse bg-[var(--color-ink)]" />
        </div>
      ) : null}
    </div>
  );
}

function InputOTPSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="input-otp-separator" className={cn('text-[var(--color-muted)]', className)} role="separator" {...props}>
      -
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };

