import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="public-page">
      <h1>A path still to be discovered.</h1>
      <p>This page doesn’t exist.</p>
      <Link href="/" className="button">
        Return home
      </Link>
    </main>
  );
}
