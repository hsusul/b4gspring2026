declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }
}

let cesiumPromise: Promise<unknown> | null = null;

export function loadCesium(): Promise<unknown> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cesium can only load in the browser."));
  }

  if (!cesiumPromise) {
    cesiumPromise = (async () => {
      window.CESIUM_BASE_URL = "/cesium";

      const CesiumModule = await import("cesium");
      return CesiumModule;
    })().catch((error) => {
      cesiumPromise = null;
      throw error;
    });
  }

  return cesiumPromise;
}
