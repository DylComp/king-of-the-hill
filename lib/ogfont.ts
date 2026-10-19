// Server-only: fonts for the share images, fetched once per instance.
const fonts = new Map<string, Promise<ArrayBuffer>>();

/** Google serves TTF when no browser user agent is sent, which is what the image renderer needs. */
export function font(family: string) {
  if (!fonts.has(family)) {
    fonts.set(
      family,
      fetch(`https://fonts.googleapis.com/css2?family=${family}`)
        .then((r) => r.text())
        .then((css) => fetch(css.match(/src: url\((.+?)\)/)![1]))
        .then((r) => r.arrayBuffer()),
    );
  }
  return fonts.get(family)!;
}
