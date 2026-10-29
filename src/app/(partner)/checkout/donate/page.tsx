export const dynamic = "force-dynamic";
import { requireSession } from "@/lib/server/auth";
import { Workspace } from "@/components/Workspace";
import { database } from "@/lib/server/database";
import { ActionForm } from "@/components/ActionForm";
import { intentAction } from "@/lib/server/actions";
export default async function Donate() {
  const s = await requireSession();
  const db = await database();
  const { data: projects } = await db
    .from("public_development_projects")
    .select("id,title");
  return (
    <Workspace name={s.profile?.full_name || "Supporter"} roles={s.roles}>
      <div className="page-heading">
        <p className="eyebrow">SUPPORT THE MOVEMENT</p>
        <h1>
          Give with purpose.
          <br />
          <em>Choose your recognition.</em>
        </h1>
        <p>
          A voluntary gift to support declared movement activities. Not a
          purchase of products, shares, repayment rights or business
          partnership.
        </p>
      </div>
      <section className="panel" style={{ maxWidth: 700 }}>
        <div className="notice">
          General support funds approved movement activities. Restricted support
          is tracked against your selected project. If it is cancelled, contact
          is required before reassignment; funds are not silently diverted.
        </div>
        <ActionForm
          action={intentAction}
          submit="Review donation payment instructions"
        >
          <label>
            Custom amount (NGN) · minimum 1,000
            <input
              name="amount"
              required
              inputMode="decimal"
              defaultValue="1000"
              list="suggested"
            />
            <datalist id="suggested">
              <option value="1000" />
              <option value="5000" />
              <option value="10000" />
            </datalist>
          </label>
          <label>
            Purpose
            <select name="project_id">
              <option value="">General movement support</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Recognition for this gift
            <select name="visibility">
              <option value="private">Private · not publicly listed</option>
              <option value="anonymous">
                Anonymous · do not identify me publicly
              </option>
              <option value="public">
                Public · subject to my separate recognition consent
              </option>
            </select>
          </label>
          <label>
            Optional dedication or message
            <textarea name="dedication" maxLength={500} />
          </label>
          <label className="checkbox">
            <input type="checkbox" name="terms" required />
            <span>
              I understand this is a voluntary contribution, with no shares,
              ownership, dividends, refunds on demand or guaranteed return. I
              have read the <a href="/policies/donations">donation policy</a>{" "}
              and use-of-funds disclosures.
            </span>
          </label>
        </ActionForm>
        <p style={{ marginTop: 20 }}>
          Public recognition also requires consent in{" "}
          <a href="/account/recognition">Recognition Preferences</a>. Your
          identity stays private by default.
        </p>
      </section>
    </Workspace>
  );
}
