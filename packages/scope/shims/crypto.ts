import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

class ShaHash {
  private buf = "";

  update(data: string): this {
    this.buf += data;
    return this;
  }

  digest(_encoding: string): string {
    return bytesToHex(sha256(new TextEncoder().encode(this.buf)));
  }
}

export function createHash(_algorithm: string): ShaHash {
  return new ShaHash();
}

export function randomUUID(): `${string}-${string}-${string}-${string}-${string}` {
  return globalThis.crypto.randomUUID();
}
