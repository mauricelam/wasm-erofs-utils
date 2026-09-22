# EROFS WebAssembly & TypeScript Bindings

This document describes how to build, test, and use the WebAssembly (WASM) version of `erofs-utils` (`liberofs`) along with its TypeScript bindings.

## Prerequisites

1. **Emscripten SDK (`emcc`)**: Ensure Emscripten is installed and available in your environment (`emcc --version`).
   - Instructions: [emscripten.org](https://emscripten.org/docs/getting_started/downloads.html) or via package manager (`apt-get install emscripten`).
2. **Node.js & npm**: Node.js v18 or later and npm.
3. **Build tools**: `make`, `autoconf`, `automake`, `libtool`, `pkg-config`.

## Building

### Quick Build (All-in-one)

Run the combined npm build command:

```bash
npm install
npm run build
```

This will automatically invoke the WASM build via `Makefile.wasm` and compile the TypeScript bindings via `tsc`.

### Building WASM Module Only

To compile `liberofs` into WebAssembly using Emscripten:

```bash
make -f Makefile.wasm
```

Or via npm script:

```bash
npm run build:wasm
```

### Build Artifacts

- `dist/erofs.js` & `dist/erofs.wasm`: Emscripten compiled WebAssembly library and JavaScript loader.
- `dist/typescript/index.js` & `dist/typescript/index.d.ts`: Compiled TypeScript wrapper and declaration files.

## TypeScript / JavaScript Usage

Import the functions from `erofs-wasm`:

```typescript
import { parse_erofs, read_erofs_file } from 'erofs-wasm';

// Load your EROFS image buffer (e.g. from File input or fetch)
const imageBuffer: Uint8Array = ...;

// 1. Parse directory tree structure
const tree = await parse_erofs(imageBuffer);
console.log('Filesystem tree:', tree);

// 2. Read contents of a file inside the EROFS image
const fileBytes = await read_erofs_file(imageBuffer, '/path/to/file.txt');
const text = new TextDecoder().decode(fileBytes);
console.log('File contents:', text);
```

## Running Tests

Automated unit tests verify superblock parsing and reading file contents from EROFS images using the Node.js test runner (`node --test`).

```bash
npm test
```

## Running the HTML Example

An interactive browser example is located in `example/index.html`.

1. Build the WASM module and TypeScript bindings:
   ```bash
   npm run build
   ```
2. Start a local HTTP server from the root directory:
   ```bash
   npx http-server . -p 8000
   ```
3. Open `http://localhost:8000/example/index.html` in your browser.
4. Select or drop an `.erofs` filesystem image file to inspect its directory structure and read files directly in the browser.
