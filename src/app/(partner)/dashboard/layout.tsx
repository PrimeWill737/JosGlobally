import { requireSession } from "@/lib/server/auth";
import { Workspace } from "@/components/Workspace";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await requireSession();
  return (
    <Workspace
      name={s.profile?.full_name || s.user.email || "Partner"}
      roles={s.roles}
    >
      {children}
    </Workspace>
  );
}
