import { modules } from "@/lib/modules";
import { database } from "@/lib/server/database";
import { recordAction, reviewRecordAction } from "@/lib/server/actions";
import { ActionForm } from "./ActionForm";
import { label } from "@/lib/domain";
export async function ModuleView({
  moduleKey,
  staff = false,
}: {
  moduleKey: string;
  staff?: boolean;
}) {
  const m = modules[moduleKey];
  const db = await database();
  const { data: rows, error } = await db
    .from(m.table)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">{staff ? "Operations" : "Your partnership"}</p>
        <h1>{m.title}</h1>
        <p>{m.description}</p>
      </div>
      <div className="workspace-grid">
        <section className="panel">
          <h2>{staff ? "Create a draft" : "New submission"}</h2>
          <ActionForm
            action={recordAction}
            submit={staff ? "Save draft" : "Submit for review"}
          >
            <input type="hidden" name="module" value={moduleKey} />
            <input type="hidden" name="staff" value={staff ? "yes" : "no"} />
            <label>
              Title
              <input name="title" required maxLength={200} />
            </label>
            <label>
              Summary
              <textarea name="summary" maxLength={4000} />
            </label>
            {m.fields.map((f) => (
              <label key={f.name}>
                {f.label}
                {f.required ? " *" : ""}
                {f.type === "textarea" ? (
                  <textarea
                    name={f.name}
                    required={f.required}
                    maxLength={12000}
                  />
                ) : f.type === "select" ? (
                  <select name={f.name}>
                    {f.options?.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={f.name}
                    type={f.type ?? "text"}
                    required={f.required}
                  />
                )}
              </label>
            ))}
          </ActionForm>
        </section>
        <section>
          <h2>{staff ? "Review queue" : "Your records"}</h2>
          {error ? (
            <p className="notice error">
              Records could not be loaded. Check the database connection and
              migrations.
            </p>
          ) : !rows?.length ? (
            <div className="empty">
              <span>◌</span>
              <h3>A fresh start</h3>
              <p>
                Your {m.title.toLowerCase()} will appear here once submitted.
              </p>
            </div>
          ) : (
            rows.map((row) => (
              <article className="panel record" key={row.id}>
                <div className="row">
                  <h3>{row.title}</h3>
                  <span className={`badge ${row.status}`}>
                    {label(row.status)}
                  </span>
                </div>
                <p>{row.summary}</p>
                <small className="mono">{row.id}</small>
                <dl>
                  {Object.entries(row.data ?? {})
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k}>
                        <dt>{label(k)}</dt>
                        <dd>{String(v)}</dd>
                      </div>
                    ))}
                </dl>
                {staff && (
                  <details>
                    <summary>Review and update</summary>
                    <ActionForm
                      action={reviewRecordAction}
                      submit="Save review"
                    >
                      <input type="hidden" name="module" value={moduleKey} />
                      <input type="hidden" name="id" value={row.id} />
                      <label>
                        Decision
                        <select name="status">
                          {[
                            "screened",
                            "documentation_requested",
                            "due_diligence",
                            "approved",
                            ...(m.public ? ["published"] : []),
                            "introductions",
                            "negotiation",
                            "closed",
                            "withdrawn",
                            "needs_information",
                            "rejected",
                            "resolved",
                          ].map((s) => (
                            <option value={s} key={s}>
                              {label(s)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Review rationale
                        <textarea name="note" required minLength={5} />
                      </label>
                      {m.public && (
                        <label>
                          Publish at (optional)
                          <input name="published_at" type="datetime-local" />
                        </label>
                      )}
                    </ActionForm>
                  </details>
                )}
              </article>
            ))
          )}
        </section>
      </div>
    </>
  );
}
