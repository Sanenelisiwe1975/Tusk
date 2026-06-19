// Minimal browser Buffer shim for walrus.ts, which uses bare Buffer.from() /
// toString("hex") as a Node global. Vite's define replaces every bare `Buffer`
// reference with `globalThis.Buffer`; main.tsx installs this object on
// globalThis before initStore() runs.
//
// Only the two call shapes walrus.ts actually uses are implemented:
//   Buffer.from(Uint8Array | number[])            .toString("hex")  — bytesToHex
//   Buffer.from(hexString, "hex")   [iterable]                      — hexToBytes
function make(bytes: Uint8Array) {
  return {
    toString(enc?: string): string {
      if (enc === "hex") {
        return Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      }
      return new TextDecoder().decode(bytes);
    },
    [Symbol.iterator]() {
      return bytes[Symbol.iterator]();
    },
    get length() {
      return bytes.length;
    },
  };
}

export const Buffer = {
  from(
    source: string | number[] | Uint8Array | ArrayBuffer,
    encoding?: string
  ): ReturnType<typeof make> {
    if (typeof source === "string") {
      if (encoding === "hex") {
        const len = source.length >> 1;
        const b = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          b[i] = parseInt(source.slice(i * 2, i * 2 + 2), 16);
        }
        return make(b);
      }
      return make(new TextEncoder().encode(source));
    }
    if (source instanceof ArrayBuffer) {
      return make(new Uint8Array(source));
    }
    return make(new Uint8Array(source));
  },
};
