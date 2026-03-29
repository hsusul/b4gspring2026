import type { SatelliteRating } from "../../types";

interface RatingSwatch {
  fill: string;
  orbit: string;
}

export const SATELLITE_RATING_ORDER: SatelliteRating[] = [
  "A",
  "B",
  "C",
  "Watch",
];

export const SATELLITE_RATING_SWATCHES: Record<SatelliteRating, RatingSwatch> = {
  A: {
    fill: "#7ed7ff",
    orbit: "#7ed7ff",
  },
  B: {
    fill: "#84e6b3",
    orbit: "#84e6b3",
  },
  C: {
    fill: "#ffb36b",
    orbit: "#ffb36b",
  },
  Watch: {
    fill: "#ff7f7f",
    orbit: "#ff7f7f",
  },
};

export function getRatingFillColor(
  rating?: SatelliteRating,
  fallbackColor = "#7ed7ff",
) {
  return rating ? SATELLITE_RATING_SWATCHES[rating].fill : fallbackColor;
}

export function getRatingOrbitColor(
  rating?: SatelliteRating,
  fallbackColor = "#7ed7ff",
) {
  return rating ? SATELLITE_RATING_SWATCHES[rating].orbit : fallbackColor;
}
