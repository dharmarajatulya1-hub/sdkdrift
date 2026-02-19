import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function isSemver(value) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value);
}

const [, , version] = process.argv;
if (!version || !isSemver(version)) {
  console.error('Usage: npm run release:prepare -- <version>');
  console.error('Example: npm run release:prepare -- 0.2.0');
  process.exit(1);
}

const root = process.cwd();
const packagePaths = [
  'packages/core/package.json',
  'packages/python-scanner/package.json',
  'packages/cli/package.json'
];

for (const relPath of packagePaths) {
  const fullPath = join(root, relPath);
  const pkg = JSON.parse(readFileSync(fullPath, 'utf8'));
  pkg.version = version;
  const deps = pkg.dependencies ?? {};
  for (const name of Object.keys(deps)) {
    if (name.startsWith('@sdkdrift/')) {
      deps[name] = `^${version}`;
    }
  }
  pkg.dependencies = deps;
  writeFileSync(fullPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  console.log(`Updated ${relPath} -> version ${version}`);
}

console.log('Release preparation complete. Run npm install to refresh lockfile.');
