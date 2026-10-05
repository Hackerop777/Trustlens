import esbuild from "esbuild";
import fs from "fs";
import path from "path";

const EXTENSION_DIR = path.resolve("extension");
const DIST_DIR = path.resolve("extension/dist");

console.log("[BUILD] Compiling TRUSTLENS Chrome Extension (Manifest V3)...");

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

// 1. Bundle Background Service Worker (ESM format for MV3)
await esbuild.build({
  entryPoints: [path.join(EXTENSION_DIR, "src/background.ts")],
  bundle: true,
  outfile: path.join(DIST_DIR, "background.js"),
  format: "esm",
  target: ["chrome100"],
  minify: false,
  sourcemap: false,
});

// 2. Bundle Content Script (IIFE format for direct browser tab execution)
await esbuild.build({
  entryPoints: [path.join(EXTENSION_DIR, "src/content.ts")],
  bundle: true,
  outfile: path.join(DIST_DIR, "content.js"),
  format: "iife",
  target: ["chrome100"],
  minify: false,
  sourcemap: false,
});

// 3. Bundle Popup Script (IIFE format for popup window)
await esbuild.build({
  entryPoints: [path.join(EXTENSION_DIR, "src/popup/popup.ts")],
  bundle: true,
  outfile: path.join(DIST_DIR, "popup.js"),
  format: "iife",
  target: ["chrome100"],
  minify: false,
  sourcemap: false,
});

// 4. Copy manifest.json
fs.copyFileSync(
  path.join(EXTENSION_DIR, "manifest.json"),
  path.join(DIST_DIR, "manifest.json")
);

// 5. Copy popup.html
fs.copyFileSync(
  path.join(EXTENSION_DIR, "src/popup/popup.html"),
  path.join(DIST_DIR, "popup.html")
);

// 6. Copy Icons
const distIconsDir = path.join(DIST_DIR, "icons");
if (!fs.existsSync(distIconsDir)) {
  fs.mkdirSync(distIconsDir, { recursive: true });
}

const srcIconsDir = path.join(EXTENSION_DIR, "icons");
if (fs.existsSync(srcIconsDir)) {
  for (const file of fs.readdirSync(srcIconsDir)) {
    fs.copyFileSync(path.join(srcIconsDir, file), path.join(distIconsDir, file));
  }
}

console.log("[SUCCESS] Chrome Extension compiled to extension/dist/");
console.log("-> Load this folder in Chrome: chrome://extensions (Enable Developer Mode -> Load unpacked -> select extension/dist)");
