import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { database } from "@/lib/server/database";
import { requireStaff } from "@/lib/server/auth";
import { DataTable } from "./DataTable";
import { ActionForm } from "./ActionForm";
import { appointPartnerAction } from "@/lib/server/admin-actions";
import { label } from "@/lib/domain";
export async function AdminGovernance({ section }: { section: string }) {
  await requireStaff(
    section === "partners"
      ? ["super_admin"]
      : ["super_admin", "auditor", "programme_manager", "procurement_manager"],
  );
  const db = await database();
  if (section === "partners") {
    const [{ data: members }, { data: agreements }, { data: profiles }] =
      await Promise.all([
        db.from("memberships").select("*"),
        db.from("public_partnership_agreements").select("id,title"),
        db.from("profiles").select("id,full_name"),
      ]);
    return (
      <>
        <div className="page-heading">
          <h1>Formal partners & stakeholders</h1>
          <p>
            Appointments require a separately approved agreement. Neither
            purchases nor gifts grant this status automatically.
          </p>
        </div>
        <div className="workspace-grid">
          <section className="panel">
            <ActionForm
              action={appointPartnerAction}
              submit="Record formal appointment"
            >
              <label>
                Member
                <select name="user_id" required>
                  {profiles?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.id}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Approved agreement
                <select name="agreement_id" required>
                  {agreements?.map((a) => (
                    <option value={a.id} key={a.id}>
                      {a.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select name="status">
                  {["active", "flagged", "suspended", "closed"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                Appointment evidence and rationale
                <textarea name="reason" required minLength={5} />
              </label>
            </ActionForm>
            <Link className="text-link" href="/admin/agreements">
              Manage agreement drafts <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>
          <section>
            <DataTable
              rows={members ?? []}
              columns={[
                "owner_id",
                "status",
                "agreement_id",
                "appointed_by",
                "joined_at",
              ]}
            />
          </section>
        </div>
      </>
    );
  }
  if (section === "recognition") {
    const { data } = await db.from("public_legacy_wall").select("*");
    return (
      <>
        <div className="page-heading">
          <h1>Consented public recognition</h1>
          <p>
            Only verified supporters who opted in appear here. Operators cannot
            override a donor’s privacy choice.
          </p>
        </div>
        <DataTable
          rows={data ?? []}
          columns={[
            "public_alias",
            "city",
            "recognition_type",
            "message",
            "supporter_since",
          ]}
        />
      </>
    );
  }
  if (section === "compliance")
    return (
      <>
        <div className="page-heading">
          <h1>Compliance workspace</h1>
          <p>
            Track evidence and accountable decisions before financial or
            international operations open.
          </p>
        </div>
        <div className="link-list">
          <Link href="/admin/identity">Identity reviews</Link>
          <Link href="/admin/diligence">Project diligence</Link>
          <Link href="/admin/risks">Risk register</Link>
          <Link href="/admin/launch">Launch readiness</Link>
          <Link href="/admin/governance">Governance publications</Link>
          <Link href="/admin/commerce">Sourcing & import controls</Link>
        </div>
      </>
    );
  const { data, error } = await db.rpc("operational_metrics");
  return (
    <>
      <div className="page-heading">
        <h1>Operational analytics</h1>
        <p>
          Actual platform events, not forecasts. Attribution of jobs and
          economic impact requires independently published evidence.
        </p>
      </div>
      {error ? (
        <p className="notice error">Could not load operational metrics.</p>
      ) : (
        <div className="stat-grid">
          {Object.entries(data ?? {}).map(([key, value]) => (
            <div className="stat" key={key}>
              <small>{label(key)}</small>
              <strong>{String(value)}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="link-list">
        <Link href="/impact">Public financial reporting</Link>
        <Link href="/admin/reports">Publish impact reports</Link>
      </div>
    </>
  );
}
