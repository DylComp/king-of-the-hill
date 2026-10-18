import { Fragment, type ElementType } from "react";

type Props = { text: string; as?: ElementType; by?: "char" | "word"; className?: string };

/** Splits text into spans so each letter or word can react on hover. */
export default function HoverText({ text, as: Tag = "span", by = "char", className = "" }: Props) {
  if (by === "word") {
    return (
      <Tag className={`hw ${className}`}>
        {text.split(/(\s+)/).map((w, i) => (/^\s+$/.test(w) ? w : <span key={i} data-w={w}>{w}</span>))}
      </Tag>
    );
  }
  // Letters sit inside per-word wrappers so lines only break between words.
  let n = 0;
  return (
    <Tag className={`hc ${className}`} aria-label={text}>
      {text.split(" ").map((word, wi) => (
        <Fragment key={wi}>
          {/* the space sits outside the nowrap wrapper so the line can break there */}
          {wi > 0 && " "}
          <span className="hcw" aria-hidden>
            {[...word].map((ch) => (
              <span key={n} className="ch" style={{ ["--i" as string]: n++ }}>
                {ch}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </Tag>
  );
}
