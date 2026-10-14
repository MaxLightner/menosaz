import {readdir, readFile, writeFile} from 'node:fs/promises';
import {extname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const textExtensions = new Set(['.html', '.css', '.js', '.json', '.webmanifest']);
const assetRoots = ['media/', 'menu-assets/', 'paper-', 'fonts/', 'box.glb'];

async function visit(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) await visit(file);
    else if (textExtensions.has(extname(entry.name))) {
      const original = await readFile(file, 'utf8');
      let updated = original;
      for (const asset of assetRoots) {
        updated = updated.replaceAll(`/${asset}`, `/menosaz/${asset}`);
        updated = updated.replaceAll(`/menosaz/menosaz/${asset}`, `/menosaz/${asset}`);
      }
      if (updated !== original) await writeFile(file, updated);
    }
  }
}

await visit(root);
