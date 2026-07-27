import { access, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(new URL('../', import.meta.url).pathname);
const required = ['dist/index.html', 'dist/src/index.js', 'dist/src/styles.css'];
for (const relative of required) {
  const path = resolve(root, relative);
  await access(path);
  if ((await stat(path)).size === 0) throw new Error(`${relative} is empty`);
}
const html = await readFile(resolve(root, 'dist/index.html'), 'utf8');
for (const reference of ['./src/styles.css', './src/index.js']) {
  if (!html.includes(reference)) throw new Error(`dist/index.html is missing ${reference}`);
}
const source = await readFile(resolve(root, 'dist/src/index.js'), 'utf8');
if (!source.includes('render();')) throw new Error('application entry point does not render');
console.log(JSON.stringify({ status: 'ok', required }));
