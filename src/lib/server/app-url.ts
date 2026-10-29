import "server-only";

const CANONICAL = "https://josglobally.com";

function localHost(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost")
  );
}

// Public links must use the live site. A missing or local APP_URL must not
// put localhost into emails sent from the deployed domain.
export function appUrl() {
  const raw = process.env.APP_URL?.trim();
  if (!raw) return CANONICAL;
  try {
    const url = new URL(raw);
    if (localHost(url.hostname)) return CANONICAL;
    if (
      url.hostname === "josglobally.com" ||
      url.hostname === "www.josglobally.com"
    )
      return CANONICAL;
    return url.origin;
  } catch {
    return CANONICAL;
  }
}
