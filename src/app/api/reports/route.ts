import { apiSession, fail } from "@/lib/server/http";
import { service } from "@/lib/server/database";
export async function GET(request: Request) {
  try {
    const { db, user } = await apiSession();
    const kind = new URL(request.url).searchParams.get("kind");
    const table =
      kind === "audit"
        ? "audit_events"
        : kind === "ledger"
          ? "ledger_entries"
          : kind === "reconciliation"
            ? "bank_statement_entries"
            : null;
    if (!table) throw new Error("Invalid report.");
    const { data: allowed } = await db.rpc("has_role", {
      wanted:
        kind === "audit"
          ? ["auditor", "super_admin"]
          : ["auditor", "finance_reviewer", "finance_approver"],
    });
    if (!allowed) throw new Error("Staff permission and MFA required.");
    const { data, error } = await db
      .from(table)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10000);
    if (error) throw error;
    const fields = data?.length ? Object.keys(data[0]) : [];
    const escape = (v: unknown) =>
      '"' +
      String(typeof v === "object" ? JSON.stringify(v) : (v ?? ""))
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    const csv = [
      fields.join(","),
      ...(data ?? []).map((row) => fields.map((k) => escape(row[k])).join(",")),
    ].join("\r\n");
    await service()
      .from("audit_events")
      .insert({
        actor_id: user.id,
        action: "report_exported",
        entity: table,
        details: { rows: data?.length ?? 0, limit: 10000 },
      });
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="jos-${kind}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
