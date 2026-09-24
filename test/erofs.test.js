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

const sampleLz4ImagePath = join(__dirname, 'sample-lz4.erofs');
const sampleLz4Buffer = new Uint8Array(readFileSync(sampleLz4ImagePath));

test('parse_erofs parses superblock and returns directory tree for LZ4 compressed EROFS image', async () => {
    const tree = await parse_erofs(sampleLz4Buffer);
    assert.ok(tree, 'Expected non-null tree object');
    assert.ok('hello.txt' in tree, 'Expected hello.txt in root directory of LZ4 image');
    assert.ok('sub' in tree, 'Expected sub directory in root directory of LZ4 image');
});

test('read_erofs_file decompresses and reads file contents from LZ4 compressed EROFS image', async () => {
    const fileBytes = await read_erofs_file(sampleLz4Buffer, '/hello.txt');
    const content = new TextDecoder().decode(fileBytes);
    assert.equal(content.trim(), 'Hello LZ4 Compressed EROFS!');
});

test('read_erofs_file decompresses and reads nested file contents from LZ4 compressed EROFS image', async () => {
    const fileBytes = await read_erofs_file(sampleLz4Buffer, '/sub/nested.txt');
    const content = new TextDecoder().decode(fileBytes);
    assert.equal(content.trim(), 'Nested LZ4 file content in EROFS.');
});
