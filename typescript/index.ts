// typescript/index.ts

// @ts-ignore - JavaScript Emscripten module build artifact
import createErofsModule from '../erofs.js';

let erofsModulePromise: Promise<any> | null = null;

export interface ErofsFileMeta {
    _size: number;
    _mode: number;
    _uid: number;
    _gid: number;
    _path: string;
}

export type ErofsNode = ErofsFileMeta | { [key: string]: ErofsNode };

export interface ErofsModuleOptions {
    locateFile?: (path: string, scriptDirectory?: string) => string;
    wasmBinary?: Uint8Array;
    [key: string]: any;
}

/**
 * Ensures that the EROFS Emscripten WebAssembly module is initialized.
 *
 * @param options Optional Emscripten module configuration options.
 * @returns Promise resolving to the initialized WebAssembly module instance.
 */
export async function ensureErofsInitialized(options: ErofsModuleOptions = {}): Promise<any> {
    if (!erofsModulePromise) {
        const defaultOptions: ErofsModuleOptions = { ...options };

        // In Node.js environment, read wasm binary directly if not provided
        if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node && !defaultOptions.wasmBinary) {
            try {
                const { readFileSync } = await import('node:fs');
                const { fileURLToPath } = await import('node:url');
                const { join, dirname } = await import('node:path');
                const wasmPath = join(dirname(fileURLToPath(import.meta.url)), '../erofs.wasm');
                defaultOptions.wasmBinary = readFileSync(wasmPath);
            } catch (e) {
                // fallback
            }
        }

        if (!defaultOptions.locateFile) {
            defaultOptions.locateFile = (path: string) => {
                if (path.endsWith('.wasm')) {
                    try {
                        return new URL('../erofs.wasm', import.meta.url).href;
                    } catch (e) {
                        return path;
                    }
                }
                return path;
            };
        }

        erofsModulePromise = createErofsModule(defaultOptions);
    }
    return erofsModulePromise;
}

/**
 * Parses an EROFS filesystem image buffer and returns its hierarchical file tree structure.
 *
 * @param data Uint8Array containing the raw EROFS filesystem image bytes.
 * @returns Promise resolving to the parsed directory tree structure.
 */
export async function parse_erofs(data: Uint8Array): Promise<Record<string, ErofsNode>> {
    const Module = await ensureErofsInitialized();
    const filename = `image_${Date.now()}_${Math.random().toString(36).substring(2)}.img`;
    const filepath = `/${filename}`;

    try {
        Module.FS.createDataFile('/', filename, data, true, true);
        const erofsParseTree = Module.cwrap('erofs_parse_tree', 'string', ['string']);
        const treeJson = erofsParseTree(filepath);
        if (!treeJson) {
            throw new Error('Failed to parse EROFS superblock or directory tree');
        }
        return JSON.parse(treeJson);
    } finally {
        try {
            Module.FS.unlink(filepath);
        } catch (e) {
            // ignore cleanup errors
        }
    }
}

/**
 * Reads the raw contents of a file from an EROFS filesystem image buffer by its absolute path.
 *
 * @param data Uint8Array containing the raw EROFS filesystem image bytes.
 * @param path Absolute path of the target file within the EROFS image (e.g. "/hello.txt").
 * @returns Promise resolving to Uint8Array with the file contents.
 */
export async function read_erofs_file(data: Uint8Array, path: string): Promise<Uint8Array> {
    const Module = await ensureErofsInitialized();
    const filename = `image_${Date.now()}_${Math.random().toString(36).substring(2)}.img`;
    const filepath = `/${filename}`;

    try {
        Module.FS.createDataFile('/', filename, data, true, true);
        const erofsReadFileData = Module.cwrap('erofs_read_file_data', 'number', ['string', 'string', 'number']);
        const erofsFreeBuf = Module.cwrap('erofs_free_buf', null, ['number']);

        const outSizePtr = Module._malloc(4);
        const dataPtr = erofsReadFileData(filepath, path, outSizePtr);
        const size = Module.HEAP32[outSizePtr >> 2];
        Module._free(outSizePtr);

        if (!dataPtr && size > 0) {
            throw new Error(`Failed to read EROFS file at path ${path}`);
        }

        const result = new Uint8Array(size);
        if (size > 0 && dataPtr) {
            result.set(Module.HEAPU8.subarray(dataPtr, dataPtr + size));
            erofsFreeBuf(dataPtr);
        }
        return result;
    } finally {
        try {
            Module.FS.unlink(filepath);
        } catch (e) {
            // ignore cleanup errors
        }
    }
}
