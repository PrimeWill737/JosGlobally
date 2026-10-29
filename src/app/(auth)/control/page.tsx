export const dynamic = "force-dynamic";
import { redirect } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { ActionForm } from "@/components/ActionForm";
import { PasswordInput } from "@/components/PasswordInput";
import { session } from "@/lib/server/auth";
import { superAdminLogin } from "@/lib/server/password-actions";
import { configured } from "@/lib/server/database";
export default async function SuperAdminEntry() {
  const s = await session();
  if (s?.roles.includes("super_admin")) redirect("/admin");
  if (s) redirect("/dashboard");
  return (
    <PublicShell>
      <div className="auth-page">
        <section className="panel auth-panel">
          <p className="eyebrow">RESTRICTED</p>
          <h1>Super admin</h1>
          <p>This entrance admits only the super admin.</p>
          {configured() ? (
            <ActionForm action={superAdminLogin} submit="Continue">
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
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
          ) : (
            <p className="notice">
              Administrator sign-in opens when the database connection is
              configured.
            </p>
          )}
        </section>
      </div>
    </PublicShell>
  );
}
