"use client";

import { useEffect } from "react";

/** Sends uncaught browser errors to /api/report, at most five per page load. */
export function reportError(message: string, where = "page") {
  if (sent >= 5) return;
  sent++;
  fetch("/api/report", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, where }), keepalive: true }).catch(() => {});
}
let sent = 0;

export default function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // Wallet extensions throw into the page constantly; only report errors from our own scripts.
      if (e.filename && !e.filename.startsWith(location.origin)) return;
      reportError(e.message || "unknown error");
    };
    const onReject = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      const stack = r instanceof Error ? (r.stack ?? "") : "";
      if (stack && !stack.includes(location.origin)) return;
      reportError(r instanceof Error ? r.message : String(r), "promise");
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
    };
  }, []);
  return null;
}
