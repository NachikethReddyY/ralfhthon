const { getFrontendBaseUrl } = require('./frontendUrl');

function luminaLogoUrl() {
  // Vite/React typically serves this from the app root.
  // In production you should host this on your public HTTPS domain.
  return `${getFrontendBaseUrl()}/favicon.svg`;
}

function card({ title, preview, intro, buttonText, url, footer, extraHtml }) {
  const safeUrl = String(url);
  const logo = luminaLogoUrl();

  return `<!doctype html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(preview || title)}
    </div>
    <div style="padding:20px 0;">
      <div style="max-width:560px;margin:0 auto;padding:0 20px;">
        <img src="${escapeHtmlAttr(logo)}" width="42" height="42" alt="Lumina" style="display:block;border-radius:16px;width:42px;height:42px;" />
        <h2 style="margin:18px 0 0 0;font-size:24px;line-height:1.3;font-weight:600;color:#111827;">
          ${escapeHtml(title)}
        </h2>
        <p style="margin:16px 0 0 0;font-size:15px;line-height:1.4;color:#374151;">
          ${escapeHtml(intro)}
        </p>

        <div style="padding:24px 0 0 0;">
          <a href="${escapeHtmlAttr(safeUrl)}"
             style="background:#111827;border-radius:6px;color:#ffffff;display:inline-block;font-size:15px;font-weight:600;line-height:1;text-decoration:none;padding:12px 16px;">
            ${escapeHtml(buttonText)}
          </a>
        </div>

        ${extraHtml || ''}

        <p style="margin:16px 0 0 0;font-size:12px;line-height:1.4;color:#6b7280;">
          If the button doesn’t work, copy and paste this link:
        </p>
        <p style="margin:8px 0 0 0;font-size:12px;line-height:1.4;color:#6b7280;word-break:break-all;">
          ${escapeHtml(safeUrl)}
        </p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0 16px 0;" />
        <p style="margin:0;font-size:12px;line-height:1.4;color:#9ca3af;">
          ${escapeHtml(footer || '')}
        </p>
      </div>
    </div>
  </body>
</html>`;
}

function verificationEmailHtml({ url, otp }) {
  const otpBlock = otp
    ? `<p style="margin:16px 0 0 0;font-size:15px;line-height:1.4;color:#374151;">
         Or enter this one-time code:
       </p>
       <div style="margin:10px 0 0 0;">
         <span style="display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-weight:700;background:#f3f4f6;color:#111827;border-radius:6px;padding:10px 12px;font-size:18px;letter-spacing:0.5px;">
           ${escapeHtml(otp)}
         </span>
       </div>`
    : '';

  return card({
    title: 'Verify your email for Lumina',
    preview: 'Verify your email for Lumina',
    intro: 'Welcome to Lumina. Please confirm your email address to activate your account.',
    buttonText: 'Verify email',
    url,
    footer: 'This link expires in 48 hours. If you did not sign up, you can ignore this email.',
    extraHtml: otpBlock,
  });
}

function passwordResetEmailHtml({ url }) {
  return card({
    title: 'Reset your Lumina password',
    preview: 'Reset your Lumina password',
    intro: 'We received a request to reset your Lumina password.',
    buttonText: 'Set a new password',
    url,
    footer: 'This link expires in 1 hour. If you did not request this, you can ignore this email.',
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeHtmlAttr(s) {
  // Same escapes as HTML for our use-case.
  return escapeHtml(s).replace(/'/g, '&#39;');
}

module.exports = { verificationEmailHtml, passwordResetEmailHtml };
