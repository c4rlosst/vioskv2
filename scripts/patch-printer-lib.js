/**
 * Reapplies fixes to react-native-thermal-receipt-printer-image-qr after npm install.
 *
 * The published package is old and breaks builds against modern React Native /
 * Android Gradle Plugin versions. npm has no built-in way to persist these fixes,
 * so this runs as a postinstall step. Each replacement is idempotent and no-ops if
 * the upstream package is ever fixed.
 */
const fs = require('fs');
const path = require('path');

const PKG = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-thermal-receipt-printer-image-qr',
);

const PING_STUB = [
  '// Patched: react-native-ping is not installed (network printers unused).',
  "var Ping = { start: function () { return Promise.reject(new Error('Network printers are not supported in this build.')); } };",
].join('\n');

const patches = [
  {
    file: 'android/build.gradle',
    // AGP no longer accepts proguard-android.txt (it implies -dontoptimize).
    from: "getDefaultProguardFile('proguard-android.txt')",
    to: "getDefaultProguardFile('proguard-android-optimize.txt')",
  },
  {
    file: 'android/build.gradle',
    // Package hardcodes SDK 32; align with the app's compile SDK.
    from: 'compileSdkVersion = 32',
    to: 'compileSdkVersion = 37',
  },
  {
    file: 'android/build.gradle',
    from: 'buildToolsVersion = "32.0.0"',
    to: 'buildToolsVersion = "37.0.0"',
  },
  {
    file: 'android/build.gradle',
    from: 'targetSdkVersion 32',
    to: 'targetSdkVersion 36',
  },
  {
    file: 'dist/utils/net-connect.js',
    // Optional peer dep we don't install; only used for network printers.
    from: "import Ping from 'react-native-ping';",
    to: PING_STUB,
  },
];

if (!fs.existsSync(PKG)) {
  console.log('[patch-printer-lib] package not installed, skipping');
  process.exit(0);
}

let applied = 0;
for (const patch of patches) {
  const target = path.join(PKG, patch.file);
  if (!fs.existsSync(target)) {
    console.warn(`[patch-printer-lib] missing file, skipped: ${patch.file}`);
    continue;
  }
  const before = fs.readFileSync(target, 'utf8');
  if (!before.includes(patch.from)) {
    continue; // already patched, or upstream changed
  }
  fs.writeFileSync(target, before.split(patch.from).join(patch.to), 'utf8');
  applied++;
}

console.log(`[patch-printer-lib] applied ${applied} patch(es)`);
