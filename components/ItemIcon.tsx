"use client";

import { useEffect, useState } from "react";
import type { ItemKind } from "@/lib/game";
import { itemIcon } from "@/lib/shop";

export default function ItemIcon({ id, kind, size = 40 }: { id: string; kind: ItemKind; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [dims, setDims] = useState({ w: 1, h: 1 });
  useEffect(() => {
    const c = itemIcon(id, kind);
    if (!c) return;
    setSrc(c.toDataURL());
    setDims({ w: c.width, h: c.height });
  }, [id, kind]);
  // Whole-number scales keep pixels square; small slots get a fractional fit so icons aren't tiny.
  const fit = size / Math.max(dims.w, dims.h);
  const scale = fit >= 2 ? Math.floor(fit) : fit;
  return (
    <span className="icon" style={{ width: size, height: size }}>
      {src && <img src={src} alt="" width={dims.w * scale} height={dims.h * scale} />}
    </span>
  );
}
