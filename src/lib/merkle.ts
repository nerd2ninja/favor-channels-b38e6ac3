import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

function hash(data: Uint8Array): Uint8Array {
  return sha256(data);
}

export function hashLeaf(value: string): Uint8Array {
  return hash(new TextEncoder().encode(value));
}

export function buildMerkleRoot(leaves: string[]): Uint8Array {
  if (leaves.length === 0) throw new Error("No leaves provided");

  let level = leaves.map(hashLeaf);

  while (level.length > 1) {
    const next: Uint8Array[] = [];
    for (let i = 0; i < level.length; i += 2) {
      if (i + 1 < level.length) {
        const combined = new Uint8Array([...level[i], ...level[i + 1]]);
        next.push(hash(combined));
      } else {
        next.push(level[i]);
      }
    }
    level = next;
  }
  return level[0];
}

export function verifyMerkleProof(
  leaf: string,
  root: Uint8Array,
  proof: Uint8Array[]
): boolean {
  let computed = hashLeaf(leaf);
  for (const p of proof) {
    const combined = new Uint8Array([...computed, ...p]);
    computed = hash(combined);
  }
  return bytesToHex(computed) === bytesToHex(root);
}
