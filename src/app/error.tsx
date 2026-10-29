"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="public-page">
      <h1>Something needs attention.</h1>
      <p>
        We couldn’t complete this request. Your financial records have not been
        changed by this error.
      </p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
