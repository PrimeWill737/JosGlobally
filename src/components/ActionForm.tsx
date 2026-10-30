"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  id,
  icon = true,
}: {
  action: (state: ActionState, data: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submit?: string;
  className?: string;
  buttonClass?: string;
  confirm?: string;
  id?: string;
  icon?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { message: "" });
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const confirmed = useRef(false);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !open || dialog.open) return;
    dialog.showModal();
  }, [open]);
  function close() {
    dialogRef.current?.close();
    setOpen(false);
  }
  function accept() {
    const form = formRef.current;
    if (!form) return;
    if (!form.checkValidity()) {
      close();
      form.reportValidity();
      return;
    }
    confirmed.current = true;
    close();
    form.requestSubmit();
  }
  return (
    <form
      ref={formRef}
      id={id}
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (confirm && !confirmed.current) {
          event.preventDefault();
          setOpen(true);
          return;
        }
        confirmed.current = false;
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
          {icon ? (
            <ArrowUpRight size={18} strokeWidth={1.75} aria-hidden="true" />
          ) : null}
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
      {open
        ? createPortal(
            <dialog
              ref={dialogRef}
              className="confirm-dialog"
              aria-labelledby={titleId}
              onClose={() => setOpen(false)}
              onClick={(event) => {
                if (event.target === dialogRef.current) close();
              }}
            >
              <div className="confirm-copy">
                <h2 id={titleId}>{submit}</h2>
                <p>{confirm}</p>
              </div>
              <div className="confirm-actions">
                <button type="button" className="button outline" onClick={close}>
                  Cancel
                </button>
                <button type="button" className={buttonClass} onClick={accept}>
                  {submit}
                </button>
              </div>
            </dialog>,
            document.body,
          )
        : null}
    </form>
  );
}
