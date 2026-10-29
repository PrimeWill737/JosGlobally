const forest = "#123c35";
const gold = "#c6a15b";
const ivory = "#f5f2e9";
const card = "#fffdf8";
const ink = "#172522";
const muted = "#5e6b63";
const sage = "#738d80";
const line = "#e2e6da";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function actionBlock(action: { href: string; label: string }) {
  const href = escapeHtml(action.href);
  const label = escapeHtml(action.label);
  return `<tr>
        <td class="pad" align="left" style="padding:8px 40px 28px;">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="8%" stroke="f" fillcolor="${forest}">
            <w:anchorlock/>
            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:600;">${label}</center>
          </v:roundrect>
          <![endif]-->
          <!--[if !mso]><!-->
          <a href="${href}" style="display:inline-block;background:${forest};border-radius:4px;padding:16px 23px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.01em;line-height:1;color:#ffffff;text-decoration:none;">${label}</a>
          <!--<![endif]-->
        </td>
      </tr>
      <tr>
        <td class="pad" style="padding:0 40px 36px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.65;color:${muted};">
          If the button does not open, copy this address into your browser:<br>
          <a href="${href}" style="color:${forest};text-decoration:underline;word-break:break-all;">${href}</a>
        </td>
      </tr>`;
}

export function renderEmail({
  preheader,
  eyebrow,
  headline,
  paragraphs,
  action,
  footnote,
}: {
  preheader: string;
  eyebrow: string;
  headline: string;
  paragraphs: string[];
  action?: { href: string; label: string };
  footnote: string;
}) {
  const year = new Date().getFullYear();
  const body = paragraphs
    .map(
      (paragraph, index) => `<tr>
        <td class="pad" style="padding:0 40px ${index === paragraphs.length - 1 ? 8 : 16}px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${muted};">
          ${escapeHtml(paragraph)}
        </td>
      </tr>`,
    )
    .join("");
  const origin = (process.env.APP_URL || "").replace(/\/$/, "");
  const badge = origin
    ? `<td style="padding:0 14px 0 0;vertical-align:middle;"><img src="${escapeHtml(origin)}/brand/emblem-badge.png" width="44" height="44" alt="" style="display:block;width:44px;height:44px;border:0;"></td>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(headline)}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
    @media only screen and (max-width: 480px) {
      .shell { padding: 24px 12px !important; }
      .pad { padding-left: 22px !important; padding-right: 22px !important; }
      .headline { font-size: 28px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${ivory};color:${ink};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${ivory};opacity:0;">${escapeHtml(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${ivory};margin:0;padding:0;">
    <tr>
      <td class="shell" align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${card};border:1px solid #dfe3d8;border-radius:6px;">
          <tr>
            <td class="pad" style="background:${forest};padding:28px 40px 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  ${badge}
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.15;letter-spacing:0.03em;font-weight:800;color:${ivory};">JOS <span style="font-weight:500;">GLOBALLY</span></p>
                    <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.4;letter-spacing:0.14em;font-weight:600;color:#d5c69e;">ROOTED HERE. CONNECTED EVERYWHERE.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="height:4px;background:${gold};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td class="pad" style="padding:32px 40px 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;letter-spacing:0.16em;font-weight:800;color:${forest};">
              ${escapeHtml(eyebrow)}
            </td>
          </tr>
          <tr>
            <td class="pad headline" style="padding:0 40px 18px;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.2;font-weight:500;letter-spacing:-0.03em;color:${forest};">
              ${escapeHtml(headline)}
            </td>
          </tr>
          ${body}
          ${action ? actionBlock(action) : ""}
          <tr>
            <td class="pad" style="padding:18px 40px 26px;border-top:1px solid ${line};font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.65;color:${sage};">
              ${escapeHtml(footnote)}<br><br>
              &copy; ${year} Jos Globally. From the Plateau, with purpose.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function signUpEmail(url: string) {
  return {
    subject: "Confirm your Jos Globally account",
    text: `Confirm your Jos Globally account\n\nOpen this link to confirm your email. The password you chose is saved when you do. It expires in 15 minutes and can be used once.\n\n${url}\n\nIf you did not request this, ignore this message. No account change will be made.`,
    html: renderEmail({
      preheader: "Confirm your email to save the password you chose.",
      eyebrow: "CREATE YOUR ACCOUNT",
      headline: "Confirm your account.",
      paragraphs: [
        "Open the button below to confirm your email. The password you chose is saved when you do. This link expires in 15 minutes and can be used once.",
      ],
      action: { href: url, label: "Confirm your account" },
      footnote:
        "If you did not request this message, you can ignore it. No account change will be made.",
    }),
  };
}

export function signInEmail(url: string) {
  return {
    subject: "Your secure Jos Globally sign-in link",
    text: `Your secure Jos Globally sign-in link\n\nOpen this link to verify your email and sign in. It expires in 15 minutes and can be used once.\n\n${url}\n\nIf you did not request this, ignore this message. No account change will be made.`,
    html: renderEmail({
      preheader: "This sign-in link expires in 15 minutes and can be used once.",
      eyebrow: "SECURE SIGN-IN",
      headline: "Your link is ready.",
      paragraphs: [
        "Open the button below to verify your email and sign in to Jos Globally. This link expires in 15 minutes and can be used once.",
      ],
      action: { href: url, label: "Sign in to Jos Globally" },
      footnote:
        "If you did not request this message, you can ignore it. No account change will be made.",
    }),
  };
}
