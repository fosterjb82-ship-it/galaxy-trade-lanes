// Packages the Electron app for one platform: node build.cjs win32 | darwin | linux
// Output: dist/Smugglers Run-<platform>-x64/ and a zip of it.
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
    executableName: platform === 'win32' ? 'SmugglersRun' : 'smugglers-run',
    appVersion: pkg.version,
    icon: path.join(__dirname, 'icon'), // packager adds .ico / .icns / .png per platform
    appCopyright: 'Smugglers Run',
    win32metadata: {
      CompanyName: 'Smugglers Run',
      FileDescription: 'Smugglers Run',
      ProductName: 'Smugglers Run',
      InternalName: 'SmugglersRun',
    },
    // only the app itself goes into the package
    ignore: [/^\/node_modules($|\/)/, /^\/dist($|\/)/, /^\/fonts($|\/)/, /^\/build\.cjs$/, /^\/prepare\.cjs$/, /^\/icon\.ico$/, /^\/README\.md$/, /^\/\.gitignore$/],
  });
  console.log('packaged:', path.relative(__dirname, dir));

  const zip = path.join(out, `SmugglersRun-${pkg.version}-${platform}-${arch}.zip`);
  fs.rmSync(zip, { force: true });
  try {
    execFileSync('zip', ['-qry', zip, path.basename(dir)], { cwd: out });
    console.log('zipped:  ', path.relative(__dirname, zip), Math.round(fs.statSync(zip).size / 1048576) + ' MB');
  } catch (e) {
    console.log('(no zip tool found; the folder above is the complete app)');
  }
})().catch(e => { console.error(e); process.exit(1); });
