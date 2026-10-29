import "server-only";
import { signInEmail, signUpEmail } from "./email-layout";

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from)
    throw new Error(
      "Email delivery is not configured. Add RESEND_API_KEY and RESEND_FROM before sending mail.",
    );
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!response.ok)
    throw new Error("The email could not be sent. Check the Resend configuration.");
}

export async function sendAuthEmail(
  email: string,
  url: string,
  purpose: "signin" | "signup" = "signin",
) {
  const message = purpose === "signup" ? signUpEmail(url) : signInEmail(url);
  await sendEmail({ to: email, ...message });
}
