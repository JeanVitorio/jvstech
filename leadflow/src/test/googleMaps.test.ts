import { describe, expect, it } from "vitest";
import { googleMapsLink } from "@/lib/googleMaps";

describe("googleMapsLink", () => {
  it("aceita links do Google Maps", () => {
    const link = "https://www.google.com/maps/place/Empresa";
    expect(googleMapsLink(link)).toBe(link);
  });

  it("aceita links curtos oficiais", () => {
    const link = "https://maps.app.goo.gl/abc123";
    expect(googleMapsLink(link)).toBe(link);
  });

  it("rejeita links externos", () => {
    expect(googleMapsLink("https://example.com/maps")).toBeNull();
  });
});
