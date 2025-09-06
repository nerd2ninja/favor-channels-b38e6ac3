import type { FavorEvent } from "../protocol/events";

/**
 * Remote signer interface (to be implemented by a NIP-46 client like Amber).
 */
export interface RemoteSigner {
  pubkey: string;
  signEvent: (event: object) => Promise<{ sig: string }>;
}

/**
 * Ask a NIP-46 signer to sign an event.
 */
export async function remoteSign(
  event: Omit<FavorEvent, "id" | "signatures">,
  signer: RemoteSigner
): Promise<string> {
  const { sig } = await signer.signEvent(event);
  return sig;
}

/**
 * Attach a new signature to the event.
 */
export function attachSignature(event: FavorEvent, sig: string): FavorEvent {
  return { ...event, signatures: [...event.signatures, sig] };
}
