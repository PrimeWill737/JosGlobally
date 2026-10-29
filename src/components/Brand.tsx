import Link from "next/link";
export function Brand({ tagline = true }: { tagline?: boolean }) {
  return (
    <Link href="/" className="brand">
      <span className="brand-icon">
        <img src="/brand/emblem.png" alt="" width={32} height={32} />
      </span>
      <span>
        JOS<span className="brand-light"> GLOBALLY</span>
        {tagline && <small>ROOTED HERE. CONNECTED EVERYWHERE.</small>}
      </span>
    </Link>
  );
}
