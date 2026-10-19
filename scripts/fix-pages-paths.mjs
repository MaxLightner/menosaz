import {readdir, readFile, writeFile} from 'node:fs/promises';
import {extname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const textExtensions = new Set(['.html', '.css', '.js', '.json', '.webmanifest']);
const assetRoots = ['media/', 'menu-assets/', 'menu-tiles/', 'paper-', 'fonts/', 'plate.glb'];
const site = new URL(process.env.VITE_PUBLIC_URL || 'https://maxlightner.github.io/menosaz');
const prefix = site.pathname.replace(/\/$/, '');

async function visit(directory) {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) await visit(file);
    else if (textExtensions.has(extname(entry.name))) {
      const original = await readFile(file, 'utf8');
      let updated = original;
      for (const asset of assetRoots) {
        updated = updated.replaceAll(`/menosaz/${asset}`, `/${asset}`);
        if (prefix) {
          updated = updated.replaceAll(`/${asset}`, `${prefix}/${asset}`);
        }
      }
      if (updated !== original) await writeFile(file, updated);
    }
  }
}

await visit(root);
