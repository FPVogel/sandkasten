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

/** Esri publishes this imagery service for public, attribution-bearing use and
 * it does not require an account, token, or API key. */
export const satelliteStyle: StyleSpecification = {
  version: 8,
  sources: {
    imagery: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
    },
  },
  layers: [{ id: "imagery", type: "raster", source: "imagery" }],
};

export function getMapStyle(theme: "dark" | "light" | "satellite"): StyleSpecification {
  if (theme === "satellite") return satelliteStyle;
  return theme === "dark" ? tacticalDarkStyle : tacticalLightStyle;
}
