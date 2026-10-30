import "server-only";
import { redirect } from "next/navigation";
import { database, configured } from "@/lib/server/database";
import type { Role } from "@/lib/domain";
export async function session() {
  if (!configured()) return null;
  const db = await database();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: assignments }, { data: aal }] =
    await Promise.all([
      db.from("profiles").select("*").eq("id", user.id).single(),
      db
        .from("role_assignments")
        .select("role,expires_at")
        .eq("user_id", user.id),
      db.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
  return {
    user,
    profile,
    roles: (assignments ?? [])
      .filter((r) => !r.expires_at || new Date(r.expires_at) > new Date())
      .map((r) => r.role as Role),
    aal: aal?.currentLevel,
  };
}
export async function requireSession() {
  const s = await session();
  if (!s) redirect("/login");
  return s;
}
export async function requireStaff(allowed?: readonly string[]) {
  const s = await requireSession();
  if (!s.roles.some((r) => r !== "partner" && r !== "business_representative"))
    redirect("/dashboard");
  // Super admin stays in the control panel. Other staff verify from their account.
  if (s.aal !== "aal2" && !s.roles.includes("super_admin"))
    redirect("/dashboard/security");
  if (allowed && !s.roles.some((r) => allowed.includes(r)))
    throw new Error("You do not have permission for this operation.");
  return s;
}
