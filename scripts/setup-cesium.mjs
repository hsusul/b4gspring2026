import { access, cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const cesiumBuildDir = path.join(repoRoot, "node_modules", "cesium", "Build", "Cesium");
const publicCesiumDir = path.join(repoRoot, "public", "cesium");
const staticDirectories = ["Assets", "ThirdParty", "Widgets", "Workers"];

async function main() {
  try {
    await access(cesiumBuildDir);
  } catch {
    console.warn("Skipping Cesium asset sync because cesium is not installed yet.");
    return;
  }

  await mkdir(publicCesiumDir, { recursive: true });

  await Promise.all(
    staticDirectories.map((directoryName) =>
      cp(
        path.join(cesiumBuildDir, directoryName),
        path.join(publicCesiumDir, directoryName),
        {
          force: true,
          recursive: true,
        },
      ),
    ),
  );

  console.log(
    `Synced Cesium static assets to ${path.relative(repoRoot, publicCesiumDir)}.`,
  );
}

main().catch((error) => {
  console.error("Failed to sync Cesium static assets.", error);
  process.exitCode = 1;
});
