import { rename, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const from = fileURLToPath(new URL('../dist-native/native.html', import.meta.url));
const to = fileURLToPath(new URL('../dist-native/index.html', import.meta.url));
await access(from);
await rename(from, to);
console.log('Prepared native index.html');
