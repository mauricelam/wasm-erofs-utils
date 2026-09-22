import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse_erofs, read_erofs_file } from '../dist/typescript/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sampleImagePath = join(__dirname, 'sample.erofs');
const sampleBuffer = new Uint8Array(readFileSync(sampleImagePath));

test('parse_erofs parses superblock and returns filesystem directory tree', async () => {
    const tree = await parse_erofs(sampleBuffer);
    assert.ok(tree, 'Expected non-null tree object');
    assert.ok('hello.txt' in tree, 'Expected hello.txt in root directory');
    assert.ok('sub' in tree, 'Expected sub directory in root directory');

    const helloNode = tree['hello.txt'];
    assert.equal(typeof helloNode._size, 'number');
    assert.ok(helloNode._size > 0, 'Expected hello.txt size > 0');
    assert.equal(helloNode._path, '/hello.txt');
});

test('read_erofs_file reads file contents correctly from EROFS image', async () => {
    const fileBytes = await read_erofs_file(sampleBuffer, '/hello.txt');
    const content = new TextDecoder().decode(fileBytes);
    assert.equal(content.trim(), 'Hello from EROFS WebAssembly!');
});

test('read_erofs_file reads nested file contents from EROFS image', async () => {
    const fileBytes = await read_erofs_file(sampleBuffer, '/sub/nested.txt');
    const content = new TextDecoder().decode(fileBytes);
    assert.equal(content.trim(), 'Nested file content in EROFS.');
});
