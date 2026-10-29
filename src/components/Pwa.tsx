"use client";
import { useEffect, useState } from "react";
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function Pwa() {
  const [online, setOnline] = useState(true);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true),
      off = () => setOnline(false),
      prompt = (e: Event) => {
        e.preventDefault();
        setInstall(e as InstallPrompt);
      };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("beforeinstallprompt", prompt);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker
        .register("/sw.js")
        .then((r) => {
          if (r.waiting) setWaiting(r.waiting);
          r.addEventListener("updatefound", () => {
            const worker = r.installing;
            worker?.addEventListener("statechange", () => {
              if (
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              )
                setWaiting(worker);
            });
          });
        })
        .catch(() => {});
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("beforeinstallprompt", prompt);
    };
  }, []);
  return (
    <div className="pwa-status">
      {!online && (
        <p role="status">
          You’re offline. Payments and uploads require a connection.
        </p>
      )}
      {waiting && (
        <button
          onClick={() => {
            waiting.postMessage({ type: "SKIP_WAITING" });
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => location.reload(),
              { once: true },
            );
          }}
        >
          Update available · Reload
        </button>
      )}
      {install && (
        <button
          onClick={async () => {
            await install.prompt();
            await install.userChoice;
            setInstall(null);
          }}
        >
          ＋ Install Jos Globally
        </button>
      )}
    </div>
  );
}
