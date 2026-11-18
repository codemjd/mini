/** Minimal ZIP writer (stored, no compression) — enough for PNG frame sequences. */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zip(files: { name: string; data: Uint8Array<ArrayBuffer> }[]): Blob {
  const parts: BlobPart[] = [];
  const central: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;
  const enc = new TextEncoder();
  for (const f of files) {
    const name = new Uint8Array(enc.encode(f.name));
    const crc = crc32(f.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, f.data.length, true);
    local.setUint32(22, f.data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(local.buffer, name, f.data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, f.data.length, true);
    cd.setUint32(24, f.data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    const entry = new Uint8Array(46 + name.length);
    entry.set(new Uint8Array(cd.buffer), 0);
    entry.set(name, 46);
    central.push(entry);
    offset += 30 + name.length + f.data.length;
  }
  const size = central.reduce((s, c) => s + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' });
}


/** Reads the uncompressed ZIP format emitted by zip(); compressed entries are rejected explicitly. */
export async function unzipStored(blob: Blob): Promise<Map<string, Uint8Array<ArrayBuffer>>> {
  if (blob.size > 600 * 1024 * 1024) throw new Error('Project bundle is larger than the 600 MB safety limit.');
  const buffer = await blob.arrayBuffer();
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const decoder = new TextDecoder();
  const files = new Map<string, Uint8Array<ArrayBuffer>>();
  const localOffsets = new Map<string, number>();
  let offset = 0;
  while (offset + 4 <= view.byteLength && view.getUint32(offset, true) === 0x04034b50) {
    if (files.size >= 10000) throw new Error('Project bundle contains too many files.');
    if (offset + 30 > view.byteLength) throw new Error('Project bundle is damaged.');
    const flags = view.getUint16(offset + 6, true);
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const size = view.getUint32(offset + 22, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    if ((flags & 0x08) !== 0 || method !== 0 || compressedSize !== size) {
      throw new Error('This ZIP uses compression or data descriptors not supported by Animora bundles.');
    }
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const dataEnd = dataStart + size;
    if (dataEnd > view.byteLength) throw new Error('Project bundle is truncated.');
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    if (!name || name.startsWith('/') || name.split('/').includes('..') || files.has(name)) {
      throw new Error('Project bundle contains an unsafe or duplicate file path.');
    }
    const copy = new Uint8Array(size);
    copy.set(bytes.subarray(dataStart, dataEnd));
    if (crc32(copy) !== view.getUint32(offset + 14, true)) throw new Error(`Project bundle file failed its integrity check: ${name}`);
    files.set(name, copy);
    localOffsets.set(name, offset);
    offset = dataEnd;
  }
  if (!files.size) throw new Error('No supported project files were found in this ZIP.');
  const endOffset = view.byteLength - 22;
  if (endOffset < offset || view.getUint32(endOffset, true) !== 0x06054b50) {
    throw new Error('Project bundle ZIP directory is missing or damaged.');
  }
  const entryCount = view.getUint16(endOffset + 10, true);
  const directorySize = view.getUint32(endOffset + 12, true);
  const directoryOffset = view.getUint32(endOffset + 16, true);
  if (view.getUint16(endOffset + 4, true) !== 0 || view.getUint16(endOffset + 6, true) !== 0
    || entryCount !== files.size || directoryOffset !== offset || directoryOffset + directorySize !== endOffset) {
    throw new Error('Project bundle ZIP directory does not match its file entries.');
  }
  let directoryCursor = directoryOffset;
  for (let index = 0; index < entryCount; index++) {
    if (directoryCursor + 46 > endOffset || view.getUint32(directoryCursor, true) !== 0x02014b50) {
      throw new Error('Project bundle ZIP directory contains an invalid entry.');
    }
    const nameLength = view.getUint16(directoryCursor + 28, true);
    const extraLength = view.getUint16(directoryCursor + 30, true);
    const commentLength = view.getUint16(directoryCursor + 32, true);
    const name = decoder.decode(bytes.subarray(directoryCursor + 46, directoryCursor + 46 + nameLength));
    const localOffset = view.getUint32(directoryCursor + 42, true);
    const data = files.get(name);
    if (!data || localOffsets.get(name) !== localOffset
      || view.getUint32(directoryCursor + 16, true) !== crc32(data)
      || view.getUint32(directoryCursor + 20, true) !== data.length
      || view.getUint32(directoryCursor + 24, true) !== data.length) {
      throw new Error('Project bundle ZIP directory failed its integrity check.');
    }
    directoryCursor += 46 + nameLength + extraLength + commentLength;
  }
  if (directoryCursor !== endOffset) throw new Error('Project bundle ZIP directory has unexpected trailing data.');
  return files;
}
