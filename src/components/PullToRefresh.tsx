"use client";
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const threshold = 72;

export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const tracking = useRef(false);
  const distance = useRef(0);

  useEffect(() => {
    const blocked = (target: EventTarget | null) => {
      const el = target instanceof Element ? target : null;
      if (!el) return true;
      if (document.body.style.overflow === "hidden") return true;
      if (
        el.closest(
          "input, textarea, select, button, a, .sidebar, .pwa-sheet, .pwa-status",
        )
      )
        return true;
      let node: Element | null = el;
      while (node && node !== document.body) {
        const style = getComputedStyle(node);
        if (
          /(auto|scroll)/.test(style.overflowY) &&
          node.scrollHeight > node.clientHeight + 1 &&
          node.scrollTop > 0
        )
          return true;
        node = node.parentElement;
      }
      return window.scrollY > 2;
    };
    const start = (event: TouchEvent) => {
      if (busy || event.touches.length !== 1 || blocked(event.target)) {
        tracking.current = false;
        return;
      }
      tracking.current = true;
      startY.current = event.touches[0].clientY;
      startX.current = event.touches[0].clientX;
      distance.current = 0;
    };
    const move = (event: TouchEvent) => {
      if (!tracking.current || event.touches.length !== 1) return;
      const dy = event.touches[0].clientY - startY.current;
      const dx = Math.abs(event.touches[0].clientX - startX.current);
      if (dy <= 0 || dx > dy || window.scrollY > 2) {
        tracking.current = dy > 0 && dx <= dy && window.scrollY <= 2;
        distance.current = 0;
        setPull(0);
        return;
      }
      event.preventDefault();
      distance.current = Math.min(dy, 120);
      setPull(distance.current);
    };
    const end = () => {
      if (!tracking.current) return;
      tracking.current = false;
      if (distance.current >= threshold) {
        setBusy(true);
        setPull(threshold);
        window.location.reload();
        return;
      }
      distance.current = 0;
      setPull(0);
    };
    document.addEventListener("touchstart", start, { passive: true });
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end);
    document.addEventListener("touchcancel", end);
    return () => {
      document.removeEventListener("touchstart", start);
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", end);
    };
  }, [busy]);

  if (pull <= 0 && !busy) return null;
  return (
    <div
      className="pull-refresh"
      style={{ transform: `translate(-50%, ${Math.min(pull, threshold)}px)` }}
      role="status"
    >
      <RefreshCw
        size={18}
        className={busy ? "loading-icon" : undefined}
        aria-hidden="true"
      />
      <span>
        {busy
          ? "Refreshing"
          : pull >= threshold
            ? "Release to refresh"
            : "Pull to refresh"}
      </span>
    </div>
  );
}
