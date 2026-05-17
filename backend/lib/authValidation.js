const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validationError(details) {
  return {
    error: 'Validation failed',
    message: 'One or more fields are invalid.',
    details,
  };
}

function normalizeEmail(raw) {
  return String(raw ?? '').trim().toLowerCase();
}

function validateEmail(raw) {
  const e = normalizeEmail(raw);
  if (!e) {
    return { ok: false, error: 'Email is required' };
  }
  if (e.length > 255) {
    return { ok: false, error: 'Email is too long' };
  }
  if (!EMAIL_RE.test(e)) {
    return { ok: false, error: 'Invalid email address' };
  }
  return { ok: true, value: e };
}

/**
 * Password rules (API + app must stay aligned):
 * 8–128 chars after trim, at least one lower, one upper, one digit.
 */
function validateNewPassword(raw) {
  const p = typeof raw === 'string' ? raw.trim() : '';
  if (!p) {
    return { ok: false, error: 'Password is required' };
  }
  if (p.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters' };
  }
  if (p.length > 128) {
    return { ok: false, error: 'Password must be at most 128 characters' };
  }
  if (!/[a-z]/.test(p)) {
    return { ok: false, error: 'Password must include a lowercase letter' };
  }
  if (!/[A-Z]/.test(p)) {
    return { ok: false, error: 'Password must include an uppercase letter' };
  }
  if (!/[0-9]/.test(p)) {
    return { ok: false, error: 'Password must include a number' };
  }
  return { ok: true, value: p };
}

function validatePersonName(raw, label) {
  const n = String(raw ?? '').trim();
  if (!n) {
    return { ok: false, error: `${label} is required` };
  }
  if (n.length > 100) {
    return { ok: false, error: `${label} is too long` };
  }
  if (/[\x00-\x1F\x7F]/.test(n)) {
    return { ok: false, error: `${label} contains invalid characters` };
  }
  return { ok: true, value: n };
}

function validateSignupBody(body) {
  const details = {};

  const email = validateEmail(body?.email);
  if (!email.ok) details.email = email.error;

  const first = validatePersonName(body?.firstName ?? body?.first_name, 'First name');
  if (!first.ok) details.firstName = first.error;

  const last = validatePersonName(body?.lastName ?? body?.last_name, 'Last name');
  if (!last.ok) details.lastName = last.error;

  const password = validateNewPassword(body?.password);
  if (!password.ok) details.password = password.error;

  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }

  return {
    ok: true,
    email: email.value,
    firstName: first.value,
    lastName: last.value,
    password: password.value,
  };
}

function validateLoginBody(body) {
  const details = {};
  const email = validateEmail(body?.email);
  if (!email.ok) details.email = email.error;
  const pw = body?.password;
  if (pw === undefined || pw === null || String(pw).length === 0) {
    details.password = 'Password is required';
  }
  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }
  return { ok: true, email: email.value, password: String(pw) };
}

function validateForgotPasswordBody(body) {
  const details = {};
  const email = validateEmail(body?.email);
  if (!email.ok) details.email = email.error;
  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }
  return { ok: true, email: email.value };
}

function validateResetPasswordBody(body) {
  const details = {};
  const token = String(body?.token ?? '').trim();
  if (!token) {
    details.token = 'Reset token is required';
  }
  const password = validateNewPassword(body?.password);
  if (!password.ok) details.password = password.error;
  if (Object.keys(details).length > 0) {
    return { ok: false, details };
  }
  return { ok: true, token, password: password.value };
}

module.exports = {
  validationError,
  validateEmail,
  validateNewPassword,
  validateSignupBody,
  validateLoginBody,
  validateForgotPasswordBody,
  validateResetPasswordBody,
};
