export function googleMapsLink(value?: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;

    const host = url.hostname.toLowerCase();
    const isGoogleHost =
      host === "google.com" ||
      host.endsWith(".google.com") ||
      host === "google.com.br" ||
      host.endsWith(".google.com.br");
    const isGoogleMaps =
      (isGoogleHost && url.pathname.startsWith("/maps")) ||
      host === "maps.app.goo.gl" ||
      (host === "goo.gl" && url.pathname.startsWith("/maps"));

    return isGoogleMaps ? url.toString() : null;
  } catch {
    return null;
  }
}
