// Packages the Electron app for one platform: node build.cjs win32 | darwin | linux
// Output: dist/Galaxy Trade Lanes-<platform>-x64/ and a zip of it.
// Building for Windows works from Linux or macOS too (no Wine needed).
const { packager } = require('@electron/packager');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const pkg = require('./package.json');

const platform = process.argv[2] || 'win32';
const arch = process.argv[3] || 'x64';
const out = path.join(__dirname, 'dist');

(async () => {
  const [dir] = await packager({
    dir: __dirname,
    out,
    platform,
    arch,
    overwrite: true,
    prune: true,
    asar: true,
    name: pkg.productName,
    executableName: platform === 'win32' ? 'GalaxyTradeLanes' : 'galaxy-trade-lanes',
    appVersion: pkg.version,
    icon: path.join(__dirname, 'icon'), // packager adds .ico / .icns / .png per platform
    appCopyright: 'Galaxy Trade Lanes',
    win32metadata: {
      CompanyName: 'Galaxy Trade Lanes',
      FileDescription: 'Galaxy Trade Lanes',
      ProductName: 'Galaxy Trade Lanes',
      InternalName: 'GalaxyTradeLanes',
    },
    // only the app itself goes into the package
    ignore: [/^\/node_modules($|\/)/, /^\/dist($|\/)/, /^\/fonts($|\/)/, /^\/build\.cjs$/, /^\/prepare\.cjs$/, /^\/icon\.ico$/, /^\/README\.md$/, /^\/\.gitignore$/],
  });
  console.log('packaged:', path.relative(__dirname, dir));

  const zip = path.join(out, `GalaxyTradeLanes-${pkg.version}-${platform}-${arch}.zip`);
  fs.rmSync(zip, { force: true });
  try {
    execFileSync('zip', ['-qry', zip, path.basename(dir)], { cwd: out });
    console.log('zipped:  ', path.relative(__dirname, zip), Math.round(fs.statSync(zip).size / 1048576) + ' MB');
  } catch (e) {
    console.log('(no zip tool found; the folder above is the complete app)');
  }
})().catch(e => { console.error(e); process.exit(1); });
