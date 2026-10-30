import "server-only";
import { scoped, type Identity } from "./postgres";
import { privateBucket } from "./cloudinary";
import { magicLink, signOut } from "./local-auth";
type Row = Record<string, any>;
type Result<S extends boolean = false> = {
  data: (S extends true ? Row : Row[]) | null;
  error: Error | null;
  count?: number | null;
};
const ident = (name: string) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name))
    throw new Error("Invalid database identifier");
  return `"${name}"`;
};
const links: Record<string, Record<string, string>> = {
  orders: { quotes: "quote_id" },
  contribution_intents: { bank_accounts: "account_id", profiles: "owner_id" },
  payment_evidence: {
    contribution_intents: "intent_id",
    profiles: "owner_id",
  },
  refunds: { contributions: "contribution_id" },
};
class Query<S extends boolean = false> implements PromiseLike<Result<S>> {
  private columns = "*";
  private filters: { key: string; op: string; value: unknown }[] = [];
  private sorting?: { key: string; asc: boolean };
  private max?: number;
  private one = false;
  private optional = false;
  private countOnly = false;
  private countRequested = false;
  private operation = "select";
  private payload: Row | Row[] | null = null;
  private conflict?: string;
  constructor(
    private table: string,
    private who: Identity | null,
    private privileged: boolean,
  ) {
    ident(table);
  }
  select(columns = "*", options?: { count?: string; head?: boolean }) {
    this.columns = columns;
    this.countOnly = options?.head ?? false;
    this.countRequested = Boolean(options?.count);
    return this;
  }
  insert(value: Row | Row[]) {
    this.operation = "insert";
    this.payload = value;
    return this;
  }
  update(value: Row) {
    this.operation = "update";
    this.payload = value;
    return this;
  }
  delete() {
    this.operation = "delete";
    return this;
  }
  upsert(value: Row, options?: { onConflict?: string }) {
    this.operation = "upsert";
    this.payload = value;
    this.conflict =
      options?.onConflict ??
      (this.table === "recognition_preferences" ? "user_id" : "id");
    return this;
  }
  eq(key: string, value: unknown) {
    this.filters.push({ key, op: "=", value });
    return this;
  }
  in(key: string, value: unknown[]) {
    this.filters.push({ key, op: "in", value });
    return this;
  }
  lte(key: string, value: unknown) {
    this.filters.push({ key, op: "<=", value });
    return this;
  }
  ilike(key: string, value: string) {
    this.filters.push({ key, op: "ilike", value });
    return this;
  }
  order(key: string, options?: { ascending?: boolean }) {
    this.sorting = { key, asc: options?.ascending ?? true };
    return this;
  }
  limit(count: number) {
    this.max = Math.max(1, Math.min(10000, count));
    return this;
  }
  single() {
    this.one = true;
    return this as unknown as Query<true>;
  }
  maybeSingle() {
    this.one = true;
    this.optional = true;
    return this as unknown as Query<true>;
  }
  private async execute(): Promise<Result<S>> {
    try {
      return await scoped(this.who, this.privileged, async (c) => {
        const params: unknown[] = [];
        const bind = (v: unknown) => {
          params.push(v);
          return `$${params.length}`;
        };
        const table = ident(this.table);
        const embedded = [
          ...this.columns.matchAll(/([a-z_]+)(!inner)?\(([^)]*)\)/g),
        ].map((m) => ({ table: m[1], inner: Boolean(m[2]), columns: m[3] }));
        let joins = "";
        const aliases = new Map<string, string>();
        embedded.forEach((e, n) => {
          const fk = links[this.table]?.[e.table];
          if (!fk) throw new Error("Unknown relationship");
          const a = `j${n}`;
          aliases.set(e.table, a);
          joins += ` ${e.inner ? "inner" : "left"} join public.${ident(e.table)} ${a} on ${a}.id=t.${ident(fk)}`;
        });
        const column = (name: string) => {
          const [a, b] = name.split(".");
          if (b && !aliases.has(a))
            throw new Error("Unknown filter relationship");
          return b ? `${aliases.get(a)}.${ident(b)}` : `t.${ident(a)}`;
        };
        const conditions = this.filters
          .map((f) =>
            f.op === "in"
              ? `${column(f.key)}=any(${bind(f.value)})`
              : `${column(f.key)} ${f.op} ${bind(f.value)}`,
          )
          .join(" and ");
        const where = conditions ? ` where ${conditions}` : "";
        let sql = "";
        if (this.operation === "select") {
          const plain = this.columns
            .replace(/[a-z_]+(!inner)?\([^)]*\)/g, "")
            .split(",")
            .filter(Boolean);
          const selects = plain.map((k) => (k === "*" ? "t.*" : column(k)));
          embedded.forEach((e, n) => {
            const a = `j${n}`;
            selects.push(
              e.columns === "*"
                ? `to_jsonb(${a}) as ${ident(e.table)}`
                : `jsonb_build_object(${e.columns
                    .split(",")
                    .map((k) => `'${k}',${a}.${ident(k)}`)
                    .join(",")}) as ${ident(e.table)}`,
            );
          });
          sql = `select ${this.countOnly ? "count(*)::int as total" : selects.join(",") || "t.*"} from public.${table} t${joins}${where}`;
          if (!this.countOnly && this.sorting)
            sql += ` order by ${column(this.sorting.key)} ${this.sorting.asc ? "asc" : "desc"}`;
          if (!this.countOnly)
            sql += ` limit ${this.one ? 2 : (this.max ?? 1000)}`;
        } else if (this.operation === "insert" || this.operation === "upsert") {
          const rows = Array.isArray(this.payload)
            ? this.payload
            : [this.payload!];
          const keys = Object.keys(rows[0]);
          sql = `insert into public.${table} (${keys.map(ident).join(",")}) values ${rows.map((row) => "(" + keys.map((k) => bind(row[k])).join(",") + ")").join(",")}`;
          if (this.operation === "upsert")
            sql += ` on conflict (${ident(this.conflict!)}) do update set ${keys
              .filter((k) => k !== this.conflict)
              .map((k) => `${ident(k)}=excluded.${ident(k)}`)
              .join(",")}`;
          sql += " returning *";
        } else if (this.operation === "update") {
          const row = this.payload as Row;
          sql = `update public.${table} t set ${Object.entries(row)
            .map(([k, v]) => `${ident(k)}=${bind(v)}`)
            .join(",")}${where} returning t.*`;
        } else sql = `delete from public.${table} t${where} returning t.*`;
        const result = await c.query(sql, params);
        if (
          this.one &&
          result.rows.length !== 1 &&
          !(this.optional && result.rows.length === 0)
        )
          throw new Error("Record not found or access denied.");
        return {
          data: (this.countOnly
            ? null
            : this.one
              ? (result.rows[0] ?? null)
              : result.rows) as Result<S>["data"],
          error: null,
          count: this.countOnly
            ? result.rows[0]?.total
            : this.countRequested
              ? result.rowCount
              : null,
        };
      });
    } catch (e) {
      return {
        data: null,
        error: e instanceof Error ? e : new Error("Database operation failed."),
      };
    }
  }
  then<TResult1 = Result<S>, TResult2 = never>(
    onfulfilled?:
      ((value: Result<S>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}
export function databaseClient(who: Identity | null, privileged = false) {
  return {
    from: (table: string) => new Query(table, who, privileged),
    async rpc(name: string, args: Record<string, unknown> = {}) {
      try {
        const data = await scoped(who, privileged, async (c) => {
          const keys = Object.keys(args);
          const result = await c.query(
            `select * from public.${ident(name)}(${keys.map((k, n) => `${ident(k)} => $${n + 1}`).join(",")})`,
            keys.map((k) =>
              [
                "items",
                "details",
                "settings",
                "lines",
                "delivery_details",
              ].includes(k)
                ? JSON.stringify(args[k])
                : args[k],
            ),
          );
          if (name === "claim_jobs") return result.rows;
          const first = result.rows[0];
          return first
            ? Object.keys(first).length === 1
              ? Object.values(first)[0]
              : first
            : null;
        });
        return { data, error: null };
      } catch (e) {
        return {
          data: null,
          error:
            e instanceof Error ? e : new Error("Database function failed."),
        };
      }
    },
    auth: {
      getUser: async () => ({
        data: { user: who ? { id: who.id, email: who.email } : null },
      }),
      signOut: async (options?: { scope?: string }) => {
        await signOut(options?.scope === "global");
        return { error: null };
      },
      signInWithOtp: async ({
        email,
      }: {
        email: string;
        options?: unknown;
      }) => {
        try {
          await magicLink(email);
          return { error: null };
        } catch (e) {
          return {
            error: e instanceof Error ? e : new Error("Email sign-in failed."),
          };
        }
      },
      mfa: {
        getAuthenticatorAssuranceLevel: async () => ({
          data: { currentLevel: who?.aal ?? "aal1" },
        }),
      },
    },
    storage: { from: privateBucket },
  };
}
