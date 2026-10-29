"use client";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
type Guide = { title: string; lead: string; steps: string[] };

function installGuide(canPrompt: boolean): Guide {
  const ua = navigator.userAgent;
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const edge = /Edg\//.test(ua);
  const firefox = /Firefox|FxiOS/i.test(ua);
  const chrome = /Chrome|CriOS/i.test(ua) && !edge;
  const safari =
    /Safari/i.test(ua) && !chrome && !firefox && !edge && !android;
  const mac = /Macintosh|Mac OS X/.test(ua) && !iOS;
  const windows = /Windows/i.test(ua);

  if (iOS) {
    return safari
      ? {
          title: "Add Jos Globally to your Home Screen",
          lead: "iPhone and iPad install the app from Safari.",
          steps: [
            "Tap the Share button in the Safari toolbar.",
            "Scroll the share sheet and tap Add to Home Screen.",
            "Tap Add. The icon then opens Jos Globally full screen.",
          ],
        }
      : {
          title: "Open this page in Safari",
          lead: "On iPhone and iPad, only Safari can add the app to the Home Screen.",
          steps: [
            "Tap the browser menu and choose Open in Safari.",
            "In Safari, tap the Share button.",
            "Tap Add to Home Screen, then tap Add.",
          ],
        };
  }
  if (android) {
    if (/SamsungBrowser/i.test(ua)) {
      return {
        title: "Add Jos Globally to your Home screen",
        lead: "Samsung Internet installs the app from the menu.",
        steps: [
          "Tap the menu button.",
          "Tap Add page to, then Home screen.",
          "Confirm the name Jos Globally.",
        ],
      };
    }
    if (firefox) {
      return {
        title: "Add Jos Globally to your Home screen",
        lead: "Firefox on Android installs the app from the menu.",
        steps: [
          "Tap the menu button.",
          "Tap Install, or Add to Home screen.",
          "Confirm the name Jos Globally.",
        ],
      };
    }
    return {
      title: "Install Jos Globally",
      lead: "Android can place the app on your Home screen.",
      steps: canPrompt
        ? [
            "Tap Install app below.",
            "Confirm the install.",
            "Open Jos Globally from your Home screen.",
          ]
        : [
            "Open the browser menu, the three dots.",
            "Tap Install app or Add to Home screen.",
            "Confirm. The icon then opens Jos Globally full screen.",
          ],
    };
  }
  if (mac && safari) {
    return {
      title: "Add Jos Globally to the Dock",
      lead: "Safari on Mac installs the app from the Share menu.",
      steps: [
        "Click the Share button in the Safari toolbar.",
        "Click Add to Dock.",
        "Click Add. Open Jos Globally from the Dock.",
      ],
    };
  }
  if (mac || (windows && (chrome || edge))) {
    return {
      title: mac
        ? "Install Jos Globally on your Mac"
        : "Install Jos Globally on this PC",
      lead: mac
        ? "Chrome and Edge on Mac use the install icon in the address bar."
        : "Chrome and Edge on Windows use the install icon in the address bar.",
      steps: canPrompt
        ? [
            "Click Install app below and confirm.",
            mac
              ? "Open Jos Globally from the Dock or Launchpad."
              : "Open Jos Globally from the Start menu.",
          ]
        : [
            "Click the install icon in the address bar.",
            "If you do not see it, open the browser menu and choose Install Jos Globally.",
            mac
              ? "Confirm Install. Open the app from the Dock or Launchpad."
              : "Confirm Install. Open the app later from the Start menu.",
          ],
    };
  }
  if (windows && firefox) {
    return {
      title: "Install from Chrome or Edge",
      lead: "Firefox on Windows does not install this app.",
      steps: [
        "Open this page in Chrome or Edge.",
        "Click the install icon in the address bar, or open the browser menu.",
        "Choose Install Jos Globally and confirm.",
      ],
    };
  }
  return {
    title: "Install Jos Globally",
    lead: "Use your browser’s install or home-screen command.",
    steps: [
      "Open the browser menu.",
      "Choose Install app or Add to Home screen.",
      "If that command is missing, open this page in Chrome or Edge and install it there.",
    ],
  };
}

export function Pwa() {
  const [online, setOnline] = useState(true);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const dismiss = () => {
    setGuide(null);
    setDismissed(true);
  };
  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    setInstalled(standalone);
    setOnline(navigator.onLine);
    const on = () => setOnline(true),
      off = () => setOnline(false),
      prompt = (e: Event) => {
        e.preventDefault();
        setInstall(e as InstallPrompt);
      },
      done = () => {
        setInstalled(true);
        setInstall(null);
        setGuide(null);
      };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("beforeinstallprompt", prompt);
    window.addEventListener("appinstalled", done);
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
      window.removeEventListener("appinstalled", done);
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
          type="button"
          className="pwa-install"
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
      {!installed && !dismissed && !guide && (
        <div className="pwa-offer">
          <button
            type="button"
            className="pwa-install"
            onClick={() => setGuide(installGuide(Boolean(install)))}
          >
            <Download size={16} strokeWidth={2} />
            Install app
          </button>
          <button
            type="button"
            className="pwa-close"
            aria-label="Close install prompt"
            onClick={dismiss}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {!installed && !dismissed && guide && (
        <div
          className="pwa-sheet"
          role="dialog"
          aria-labelledby="pwa-install-title"
        >
          <div className="pwa-sheet-head">
            <h2 id="pwa-install-title">{guide.title}</h2>
            <button
              type="button"
              className="pwa-close"
              aria-label="Close install prompt"
              onClick={dismiss}
            >
              <X size={16} />
            </button>
          </div>
          <p>{guide.lead}</p>
          <ol>
            {guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="pwa-sheet-actions">
            {install && (
              <button
                type="button"
                className="button"
                onClick={async () => {
                  await install.prompt();
                  const choice = await install.userChoice;
                  setInstall(null);
                  if (choice.outcome === "accepted") setGuide(null);
                }}
              >
                Install app
              </button>
            )}
            <button
              type="button"
              className="pwa-dismiss"
              onClick={dismiss}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
