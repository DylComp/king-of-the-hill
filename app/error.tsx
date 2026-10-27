"use client";

import { useEffect } from "react";
import { reportError } from "@/components/ErrorReporter";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportError(error.message, "render"), [error]);
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
      <div>
        <p className="pixel green">tracker unavailable</p>
        <p className="dim">Something went wrong loading the tracker. Please try again.</p>
        <button className="btn" onClick={reset}>
          try again
        </button>
      </div>
    </main>
  );
}
