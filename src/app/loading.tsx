import { LoaderCircle } from "lucide-react";
export default function Loading() {
  return (
    <main id="main" className="loading" role="status" aria-label="Loading">
      <LoaderCircle
        className="loading-icon"
        size={40}
        strokeWidth={1.6}
        aria-hidden="true"
      />
    </main>
  );
}
