import { requireStaff } from "@/lib/server/auth";
import { Workspace } from "@/components/Workspace";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await requireStaff();
  return (
    <Workspace admin name={s.profile?.full_name || "Operator"} roles={s.roles}>
      {children}
    </Workspace>
  );
}
