import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const packagePaths = [
  'packages/core/package.json',
  'packages/python-scanner/package.json',
  'packages/cli/package.json'
];

let ok = true;

for (const relPath of packagePaths) {
  const fullPath = join(root, relPath);
  const pkg = JSON.parse(readFileSync(fullPath, 'utf8'));
  const deps = pkg.dependencies ?? {};
  for (const [name, version] of Object.entries(deps)) {
    if (!name.startsWith('@sdkdrift/')) continue;
    if (typeof version !== 'string') continue;
    if (version.startsWith('file:') || version.startsWith('workspace:')) {
      console.error(`${relPath}: ${name} uses non-publishable range '${version}'`);
      ok = false;
    }
  }
}

if (!ok) {
  process.exit(1);
}

console.log('Publish dependency check passed.');
