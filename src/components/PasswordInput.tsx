"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
export function PasswordInput(props: React.ComponentProps<"input">) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="password-field">
      <input {...props} type={visible ? "text" : "password"} />
      <button
        type="button"
        className="password-toggle"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? (
          <EyeOff size={18} strokeWidth={1.6} />
        ) : (
          <Eye size={18} strokeWidth={1.6} />
        )}
      </button>
    </span>
  );
}
