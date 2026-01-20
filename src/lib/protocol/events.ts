import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";

export type FavorEventType =
  | "favor:init"
  | "favor:preapproval"
  | "favor:settlement";

export interface BasePayload {
  [key: string]: unknown;
}

export interface FavorEvent<T extends BasePayload = BasePayload> {
  id: string; // event hash
  type: FavorEventType;
  channelId: string;
  version: number;
  expiration?: number; // unix timestamp
  payload: T;
  signatures: string[];
}

/**
 * Serialize an event deterministically (exclude id/signatures)
 */
export function serializeEvent<T extends BasePayload>(
  event: Omit<FavorEvent<T>, "id" | "signatures">
): string {
  return JSON.stringify(
    {
      type: event.type,
      channelId: event.channelId,
      version: event.version,
      expiration: event.expiration,
      payload: event.payload,
    },
    Object.keys(event).sort()
  );
}

export function computeEventId<T extends BasePayload>(
  event: Omit<FavorEvent<T>, "id" | "signatures">
): string {
  const serialized = serializeEvent(event);
  return bytesToHex(sha256(new TextEncoder().encode(serialized)));
}

export function validateEvent(event: FavorEvent, threshold: number): boolean {
  if (!event.id || !event.type || !event.channelId || !event.version) return false;
  if (event.signatures.length < threshold) return false;
  return true;
}
