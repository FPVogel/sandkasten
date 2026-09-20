import type { StyleSpecification } from "maplibre-gl";

function openStreetMapStyle(dark: boolean): StyleSpecification {
  return {
    version: 8,
    sources: {
      openstreetmap: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors",
      },
    },
    layers: [{
      id: "openstreetmap",
      type: "raster",
      source: "openstreetmap",
      paint: dark ? {
        "raster-brightness-max": 0.42,
        "raster-contrast": 0.25,
        "raster-saturation": -0.75,
      } : undefined,
    }],
  };
}

// OpenStreetMap's public raster tiles require attribution, but no account,
// access token, API key, or billing setup.
export const tacticalDarkStyle = openStreetMapStyle(true);
export const tacticalLightStyle = openStreetMapStyle(false);

export function getMapStyle(theme: "dark" | "light"): StyleSpecification {
  return theme === "dark" ? tacticalDarkStyle : tacticalLightStyle;
}
