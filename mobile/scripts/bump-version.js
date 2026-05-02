#!/usr/bin/env node
/**
 * Pre-build helper: bump the `expo.version` patch number in app.json.
 *
 * EAS `"autoIncrement": true` already bumps `versionCode` automatically,
 * but it does NOT touch `versionName` ("expo.version" in app.json). Play
 * Store's update UX shows versionName to users, so keeping the same
 * versionName across builds confuses its cache ("already latest" message
 * even when versionCode differs).
 *
 * This script bumps the patch version (e.g. 0.4.8 → 0.4.9) so every new
 * production build gets a unique versionName + a fresh runtimeVersion
 * (because `runtimeVersion: {policy: "appVersion"}` follows version).
 *
 * Usage:
 *   node scripts/bump-version.js           # bumps patch (0.4.8 → 0.4.9)
 *   node scripts/bump-version.js minor     # bumps minor (0.4.8 → 0.5.0)
 *   node scripts/bump-version.js major     # bumps major (0.4.8 → 1.0.0)
 */
const fs = require("fs");
const path = require("path");

const APP_JSON = path.resolve(__dirname, "..", "app.json");
const bumpType = process.argv[2] || "patch";
if (!["patch", "minor", "major"].includes(bumpType)) {
  console.error(`Unknown bump type: ${bumpType} (expected patch|minor|major)`);
  process.exit(1);
}

const raw = fs.readFileSync(APP_JSON, "utf8");
const cfg = JSON.parse(raw);
const current = cfg.expo.version;
const [major, minor, patch] = current.split(".").map((n) => parseInt(n, 10));
let next;
if (bumpType === "major") next = `${major + 1}.0.0`;
else if (bumpType === "minor") next = `${major}.${minor + 1}.0`;
else next = `${major}.${minor}.${patch + 1}`;

cfg.expo.version = next;
fs.writeFileSync(APP_JSON, JSON.stringify(cfg, null, 2) + "\n", "utf8");
console.log(`✓ Bumped expo.version: ${current} → ${next}`);
console.log(`  runtimeVersion will resolve to: ${next} (via policy: appVersion)`);
console.log(
  `\nNext step: run 'npx eas build --platform android --profile production'`,
);
console.log(
  "  EAS will auto-increment versionCode. Users on Play Store will see",
);
console.log(
  `  a clean "${current} → ${next}" update and won't need to clear cache.`,
);
