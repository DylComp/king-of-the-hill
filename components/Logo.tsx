// Shared King of the Hill brand mark.
export default function Logo({ size = 28 }: { size?: number }) {
  return <img className="logo-svg pixelated" src="/king-logo.png" alt="" aria-hidden width={size} height={size} decoding="async" />;
}
