/** Must match `backend/lib/authValidation.js` (`validateNewPassword`). */
export const PASSWORD_REQUIREMENTS_TEXT =
  'Use 8–128 characters with at least one uppercase letter, one lowercase letter, and one number.';

export function getNewPasswordError(raw: string): string | null {
  const p = typeof raw === 'string' ? raw.trim() : '';
  if (!p) return 'Password is required';
  if (p.length < 8) return 'Password must be at least 8 characters';
  if (p.length > 128) return 'Password must be at most 128 characters';
  if (!/[a-z]/.test(p)) return 'Password must include a lowercase letter';
  if (!/[A-Z]/.test(p)) return 'Password must include an uppercase letter';
  if (!/[0-9]/.test(p)) return 'Password must include a number';
  return null;
}
