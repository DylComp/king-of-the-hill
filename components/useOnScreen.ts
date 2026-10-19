"use client";

import { type RefObject, useEffect, useRef } from "react";

/**
 * Tracks whether an element is on screen without re-rendering. Canvas loops read
 * `.current` each frame and skip drawing while it's false, so off-screen animations
 * cost nothing.
 */
export function useOnScreen(target: RefObject<Element | null>, margin = "200px") {
  // Starts true so the first frame always paints; the observer corrects it right after.
  const visible = useRef(true);
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => (visible.current = e.isIntersecting), { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [target, margin]);
  return visible;
}
