"use client";
import { useState } from "react";
export function PushSettings() {
  const [message, setMessage] = useState("");
  return (
    <>
      <button
        className="button outline"
        onClick={async () => {
          try {
            const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (
              !key ||
              !("serviceWorker" in navigator) ||
              !("PushManager" in window)
            )
              throw new Error(
                "Push notifications are not configured or supported in this browser.",
              );
            if ((await Notification.requestPermission()) !== "granted")
              throw new Error("Notification permission was not granted.");
            const reg = await navigator.serviceWorker.ready;
            const raw = atob(key.replace(/-/g, "+").replace(/_/g, "/"));
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: Uint8Array.from(raw, (c) =>
                c.charCodeAt(0),
              ),
            });
            const res = await fetch("/api/push", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(sub),
            });
            if (!res.ok)
              throw new Error("Could not save your notification preference.");
            setMessage("Push notifications enabled.");
          } catch (e) {
            setMessage(
              e instanceof Error ? e.message : "Notification setup failed.",
            );
          }
        }}
      >
        Enable push notifications
      </button>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </>
  );
}
