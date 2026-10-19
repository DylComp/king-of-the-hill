// The Pump Tower mark: a pixel skyscraper with a green and white pill on its roof.
// `size` is the height in pixels; the width follows the artwork (203 x 512).
const RATIO = 203 / 512;

export default function Logo({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="logo-svg" src="/logo-mark.png" alt="" aria-hidden width={Math.round(size * RATIO)} height={size} decoding="async" />
  );
}
