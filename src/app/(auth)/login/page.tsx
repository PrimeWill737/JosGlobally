export const dynamic = "force-dynamic";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { passwordLogin, signupAction } from "@/lib/server/password-actions";
import { PublicShell } from "@/components/PublicShell";
import { ActionForm } from "@/components/ActionForm";
import { PasswordInput } from "@/components/PasswordInput";
import { configured } from "@/lib/server/database";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <PublicShell>
      <div className="auth-page">
        <section className="panel auth-panel">
          <p className="eyebrow">YOUR CONNECTION STARTS HERE</p>
          <h1>
            Welcome to
            <br />
            <em>the movement.</em>
          </h1>
          <p>
            Sign in with your password, or create an account and choose one
            now.
          </p>
          <Link href="/" className="button small outline back-home">
            <ArrowLeft size={16} aria-hidden="true" />
            Back to home
          </Link>
          {error && (
            <p className="notice error">
              This confirmation link has expired or is invalid. Create your
              account again.
            </p>
          )}
          {configured() ? (
            <>
              <ActionForm action={passwordLogin} submit="Sign in">
                <label>
                  Email address
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>
                <label>
                  Password
                  <PasswordInput
                    name="password"
                    autoComplete="current-password"
                    required
                  />
                </label>
              </ActionForm>
              <details>
                <summary>Create an account</summary>
                <ActionForm action={signupAction} submit="Create account">
                  <label>
                    Email address
                    <input
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                    />
                  </label>
                  <label>
                    Password
                    <PasswordInput
                      name="password"
                      autoComplete="new-password"
                      required
                      minLength={12}
                    />
                    <small>Use at least 12 characters.</small>
                  </label>
                  <label>
                    Confirm password
                    <PasswordInput
                      name="confirm"
                      autoComplete="new-password"
                      required
                      minLength={12}
                    />
                  </label>
                  <label className="checkbox">
                    <input type="checkbox" name="consent" required />
                    <span>
                      I agree to the{" "}
                      <a href="/terms">terms of participation</a> and{" "}
                      <a href="/privacy">privacy notice</a>.
                    </span>
                  </label>
                </ActionForm>
              </details>
            </>
          ) : (
            <p className="notice">
              Accounts will open when the PostgreSQL connection is configured.
              Explore the movement while setup is completed.
            </p>
          )}
        </section>
      </div>
    </PublicShell>
  );
}
