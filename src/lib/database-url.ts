export function databaseUrl(raw: string | undefined) {
  if (!raw) throw new Error("DATABASE_URL is required.");
  const start = raw.search(/postgres(?:ql)?:\/\//i);
  const normalized =
    start >= 0
      ? raw.slice(start).trim()
      : !raw.includes("://") && raw.includes("@")
        ? `postgresql://${raw.trim()}`
        : raw.trim();
  const url = new URL(normalized);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !url.hostname ||
    !url.username ||
    url.pathname.length < 2
  )
    throw new Error(
      "DATABASE_URL must be a PostgreSQL connection URI with a username, host and database.",
    );
  return normalized;
}
