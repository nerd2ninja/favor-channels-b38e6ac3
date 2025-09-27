import CryptoJS from 'crypto-js';
import { FAVOR_EVENT_KINDS } from '../types/favorEvents';

/**
 * Generate channel ID from participants and creation time
 * Formula: sha256(sorted(pubkeys) || creation_time)
 */
export function generateChannelId(participants: string[], creationTime: number): string {
  const sortedPubkeys = [...participants].sort();
  const data = sortedPubkeys.join('') + creationTime.toString();
  return CryptoJS.SHA256(data).toString(CryptoJS.enc.Hex);
}

/**
 * Core Favor Channel Event Structure (before NIP-46 signing)
 */
export interface FavorChannelEvent {
  kind: number;
  channel_id: string;
  state_version: number;
  payload: Record<string, any>;
  signatures: Array<{ pubkey: string; sig: string }>;
}

/**
 * Create unsigned channel_create event
 */
export function createChannelCreateEvent(
  participants: string[],
  channelName?: string,
  metadata?: Record<string, any>
): FavorChannelEvent {
  const creationTime = Math.floor(Date.now() / 1000);
  const channelId = generateChannelId(participants, creationTime);

  return {
    kind: FAVOR_EVENT_KINDS.CHANNEL_CREATE,
    channel_id: channelId,
    state_version: 0,
    payload: {
      participants,
      creation_time: creationTime,
      ...(channelName && { channel_name: channelName }),
      ...(metadata && { metadata })
    },
    signatures: [] // Will be populated after NIP-46 signing
  };
}

/**
 * Create unsigned favor_update event
 */
export function createFavorUpdateEvent(
  channelId: string,
  stateVersion: number,
  fromPubkey: string,
  toPubkey: string,
  amount: number,
  description: string,
  favorType: 'debt' | 'credit' | 'settlement' = 'debt'
): FavorChannelEvent {
  const timestamp = Math.floor(Date.now() / 1000);

  return {
    kind: FAVOR_EVENT_KINDS.FAVOR_UPDATE,
    channel_id: channelId,
    state_version: stateVersion,
    payload: {
      from_pubkey: fromPubkey,
      to_pubkey: toPubkey,
      amount,
      description,
      timestamp,
      favor_type: favorType
    },
    signatures: [] // Will be populated after NIP-46 signing
  };
}

/**
 * Create unsigned preapproval event
 */
export function createPreapprovalEvent(
  channelId: string,
  stateVersion: number,
  approverPubkey: string,
  maxAmount: number,
  expiry: number,
  conditions?: string[],
  autoApprove: boolean = false
): FavorChannelEvent {
  return {
    kind: FAVOR_EVENT_KINDS.PREAPPROVAL,
    channel_id: channelId,
    state_version: stateVersion,
    payload: {
      approver_pubkey: approverPubkey,
      max_amount: maxAmount,
      expiry,
      ...(conditions && { conditions }),
      auto_approve: autoApprove
    },
    signatures: [] // Will be populated after NIP-46 signing
  };
}

/**
 * Convert favor event to Nostr event format for NIP-46 signing
 */
export function convertToNostrEvent(
  favorEvent: FavorChannelEvent,
  userPubkey: string
): Partial<import('nostr-tools').Event> {
  const timestamp = Math.floor(Date.now() / 1000);
  
  return {
    kind: favorEvent.kind,
    pubkey: userPubkey,
    created_at: timestamp,
    tags: [
      ['d', favorEvent.channel_id], // replaceable event identifier
      ['channel_id', favorEvent.channel_id],
      ['state_version', favorEvent.state_version.toString()]
    ],
    content: JSON.stringify(favorEvent)
  };
}

/**
 * Example unsigned event payloads
 */
export const EXAMPLE_UNSIGNED_EVENTS = {
  CHANNEL_CREATE: {
    description: "Create a new favor channel between participants",
    example: {
      kind: FAVOR_EVENT_KINDS.CHANNEL_CREATE,
      channel_id: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      state_version: 0,
      payload: {
        participants: [
          "npub1alice...",
          "npub1bob..."
        ],
        creation_time: 1704067200,
        channel_name: "Alice & Bob Favor Channel",
        metadata: {
          description: "Tracking favors between Alice and Bob"
        }
      },
      signatures: []
    }
  },

  FAVOR_UPDATE: {
    description: "Record a favor transaction between channel participants",
    example: {
      kind: FAVOR_EVENT_KINDS.FAVOR_UPDATE,
      channel_id: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      state_version: 1,
      payload: {
        from_pubkey: "npub1alice...",
        to_pubkey: "npub1bob...",
        amount: 2,
        description: "Help with moving apartment",
        timestamp: 1704067260,
        favor_type: "debt"
      },
      signatures: []
    }
  },

  PREAPPROVAL: {
    description: "Set preapproval limits for automatic favor processing",
    example: {
      kind: FAVOR_EVENT_KINDS.PREAPPROVAL,
      channel_id: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      state_version: 1,
      payload: {
        approver_pubkey: "npub1alice...",
        max_amount: 5,
        expiry: 1704153600,
        conditions: ["Small household tasks", "Under 2 hours of work"],
        auto_approve: true
      },
      signatures: []
    }
  }
} as const;

/**
 * JSON Schema for validation
 */
export const FAVOR_EVENT_SCHEMA = {
  type: "object",
  required: ["kind", "channel_id", "state_version", "payload", "signatures"],
  properties: {
    kind: { type: "integer", enum: [30100, 30101, 30102] },
    channel_id: { type: "string", pattern: "^[a-fA-F0-9]{64}$" },
    state_version: { type: "integer", minimum: 0 },
    payload: { type: "object" },
    signatures: {
      type: "array",
      items: {
        type: "object",
        required: ["pubkey", "sig"],
        properties: {
          pubkey: { type: "string", pattern: "^[a-fA-F0-9]{64}$" },
          sig: { type: "string", pattern: "^[a-fA-F0-9]{128}$" }
        }
      }
    }
  }
} as const;