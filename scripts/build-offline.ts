import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

async function filesAt(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const lists = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? filesAt(join(directory, entry.name))
        : [join(directory, entry.name)],
    ),
  );
  return lists.flat();
}
const files = (await filesAt('dist')).filter(
  (file) => !file.endsWith('sw.js') && !file.endsWith('.map'),
);
const hash = createHash('sha256');
for (const file of files.sort()) hash.update(await readFile(file));
const cache = `arcadehub-${hash.digest('hex').slice(0, 12)}`;
const urls = files.map((file) => `/${file.slice(5)}`);
await writeFile(
  'dist/sw.js',
  `
const CACHE = ${JSON.stringify(cache)};
const ASSETS = ${JSON.stringify(urls)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('arcadehub-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    if (event.request.mode === 'navigate') return (await cache.match('/index.html')) || fetch(event.request);
    return (await cache.match(event.request)) || fetch(event.request);
  }));
});
`,
);
console.log(`Offline cache prepared: ${urls.length} assets`);
