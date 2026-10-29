"use client";
import { useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { ActionForm } from "./ActionForm";
import { PasswordInput } from "./PasswordInput";
import { deleteAccountAction, setPasswordAction } from "@/lib/server/password-actions";
export function Security({ hasPassword = false }: { hasPassword?: boolean }) {
  const [message, setMessage] = useState("");
  const [qr, setQr] = useState("");
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [verified, setVerified] = useState(false);
  async function call(body: Record<string, string>) {
    setPending(true);
    try {
      const res = await fetch("/api/auth/mfa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.qr) setQr(data.qr);
      if (data.existing || data.qr) setReady(true);
      if (data.recoveryCodes) setCodes(data.recoveryCodes);
      if (data.ok) {
        setVerified(true);
        setQr("");
      }
      setMessage(data.message);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Security operation failed.");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <section className="panel">
        <h2>Authenticator verification</h2>
        <p>
          Every staff session requires MFA. This also protects your account.
        </p>
        <button
          className="button"
          onClick={() => call({ operation: "enroll" })}
          disabled={pending}
          aria-busy={pending}
          aria-label={pending ? "Loading" : undefined}
        >
          <span className={pending ? "button-label is-pending" : "button-label"}>
            Set up or verify authenticator
          </span>
          {pending && (
            <LoaderCircle
              className="loading-icon"
              size={18}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          )}
        </button>
        {qr && (
          <img
            className="security-qr"
            src={qr}
            alt="Authenticator setup QR code"
          />
        )}
        {ready && !verified && (
          <form
            className="form"
            style={{ marginTop: 20 }}
            onSubmit={(e) => {
              e.preventDefault();
              void call({
                operation: "verify",
                code: String(new FormData(e.currentTarget).get("code")),
              });
            }}
          >
            <label>
              Six-digit code
              <input
                name="code"
                pattern="[0-9]{6}"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </label>
            <button
              className="button"
              disabled={pending}
              aria-busy={pending}
              aria-label={pending ? "Loading" : undefined}
            >
              <span
                className={pending ? "button-label is-pending" : "button-label"}
              >
                Verify
              </span>
              {pending && (
                <LoaderCircle
                  className="loading-icon"
                  size={18}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
            </button>
          </form>
        )}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        {codes.length > 0 && (
          <div className="notice">
            <strong>
              Save these one-time recovery codes securely. They are shown only
              now.
            </strong>
            <pre>{codes.join("\n")}</pre>
          </div>
        )}
        {verified && (
          <Link href="/admin" className="button">
            Continue to operations →
          </Link>
        )}
        <details>
          <summary>Use a one-time recovery code</summary>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              void call({
                operation: "recover",
                code: String(new FormData(e.currentTarget).get("code")),
              });
            }}
          >
            <label>
              Recovery code
              <input name="code" required autoComplete="off" />
            </label>
            <button
              className="button"
              disabled={pending}
              aria-busy={pending}
              aria-label={pending ? "Loading" : undefined}
            >
              <span
                className={pending ? "button-label is-pending" : "button-label"}
              >
                Verify recovery code
              </span>
              {pending && (
                <LoaderCircle
                  className="loading-icon"
                  size={18}
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              )}
            </button>
          </form>
        </details>
        <button
          className="text-link"
          style={{ background: "none", marginTop: 20 }}
          onClick={async () => {
            const r = await fetch("/api/auth/signout", { method: "POST" });
            if (r.ok) location.assign("/login");
            else setMessage("Could not revoke sessions. Please try again.");
          }}
        >
          Sign out all my sessions
        </button>
      </section>
      <section className="panel">
        <h2>Password sign-in</h2>
        <p>
          Set a password after email verification, or change your current
          password. Use at least 12 characters.
        </p>
        <ActionForm action={setPasswordAction} submit="Save password">
          <label>
            Current password (if set)
            <PasswordInput
              name="current_password"
              autoComplete="current-password"
            />
          </label>
          <label>
            New password
            <PasswordInput
              name="password"
              minLength={12}
              required
              autoComplete="new-password"
            />
          </label>
          <label>
            Confirm new password
            <PasswordInput
              name="confirm"
              minLength={12}
              required
              autoComplete="new-password"
            />
          </label>
        </ActionForm>
      </section>
      <section className="panel">
        <h2>Delete account</h2>
        <p>
          This permanently deletes your account and the records that belong to
          it, including your profile, orders and contributions. It cannot be
          undone.
        </p>
        <ActionForm
          action={deleteAccountAction}
          submit="Delete account"
          buttonClass="button danger"
        >
          {hasPassword ? (
            <label>
              Password
              <PasswordInput
                name="password"
                autoComplete="current-password"
                required
              />
            </label>
          ) : (
            <label>
              Email address on this account
              <input name="email" type="email" autoComplete="email" required />
            </label>
          )}
          <label>
            Type DELETE to confirm
            <input name="confirm_delete" autoComplete="off" required />
          </label>
        </ActionForm>
      </section>
    </>
  );
}
