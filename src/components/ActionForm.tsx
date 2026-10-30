"use client";
import { useActionState } from "react";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
import type { ActionState } from "@/lib/server/actions";
export function ActionForm({
  action,
  children,
  submit = "Save",
  className = "form",
  buttonClass = "button",
  confirm,
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submit?: string;
  className?: string;
  buttonClass?: string;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, { message: "" });
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {children}
      <button
        className={buttonClass}
        disabled={pending}
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
      {state.message && (
        <p role="status" className={`notice ${state.ok ? "success" : "error"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
