"use client";
import { useState } from "react";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
export function FileForm({
  action,
  children,
  submit,
}: {
  action: string;
  children: React.ReactNode;
  submit: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <form
      className="form"
      action={action}
      method="post"
      encType="multipart/form-data"
      onSubmit={(event) => {
        if (pending) {
          event.preventDefault();
          return;
        }
        setPending(true);
      }}
    >
      {children}
      <button
        className="button"
        aria-busy={pending}
        aria-label={pending ? "Loading" : undefined}
      >
        <span className={pending ? "button-label is-pending" : "button-label"}>
          {submit}
          <ArrowUpRight size={18} strokeWidth={1.75} aria-hidden="true" />
        </span>
        {pending && (
          <LoaderCircle
            className="loading-icon"
            size={18}
            strokeWidth={1.75}
            aria-hidden="true"
          />
        )}
      </button>
    </form>
  );
}
