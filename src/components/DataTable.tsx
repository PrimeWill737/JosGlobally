import { label, shown } from "@/lib/domain";
export function DataTable({
  rows,
  columns,
}: {
  rows: Record<string, unknown>[];
  columns: string[];
}) {
  return rows.length ? (
    <div
      className="table-wrap"
      tabIndex={0}
      role="region"
      aria-label="Scrollable records table"
    >
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{label(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, index) => (
            <tr key={String(r.id ?? index)}>
              {columns.map((c) => (
                <td key={c} className={c === "status" ? "cell-status" : undefined}>
                  {c === "status" && typeof r[c] === "string"
                    ? label(r[c])
                    : shown(r[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="empty">
      <h3>No records in this queue.</h3>
      <p>New activity will appear here.</p>
    </div>
  );
}
