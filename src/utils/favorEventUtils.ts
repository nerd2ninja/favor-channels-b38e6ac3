import { Event } from 'nostr-tools';
import {
  FAVOR_EVENT_KINDS,
  UnsignedFavorEvent,
  ChannelCreatePayload,
  FavorUpdatePayload,
  PreapprovalPayload
} from '../types/favorEvents';

// Simple SHA256 implementation for channel ID generation
function sha256Simple(data: string): string {
  // For now, use a simple hash based on the input string
  // In production, you'd want to use a proper crypto library
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Generate channel ID from participants and creation time
 * Formula: sha256(sorted(pubkeys) || creation_time)
 */
export function generateChannelId(participants: string[], creationTime: number): string {
  const sortedPubkeys = [...participants].sort();
  const data = sortedPubkeys.join('') + creationTime.toString();
  return sha256Simple(data);
}

/**
 * Create unsigned channel_create event
 */
export function createUnsignedChannelCreateEvent(
  userPubkey: string,
  participants: string[],
  channelName?: string,
  metadata?: Record<string, any>
): UnsignedFavorEvent {
  const creationTime = Math.floor(Date.now() / 1000);
  const channelId = generateChannelId(participants, creationTime);

  const payload: ChannelCreatePayload = {
    participants,
    creation_time: creationTime,
    ...(channelName && { channel_name: channelName }),
    ...(metadata && { metadata })
  };

  return {
    kind: FAVOR_EVENT_KINDS.CHANNEL_CREATE,
    pubkey: userPubkey,
    created_at: creationTime,
    tags: [
      ['d', channelId], // replaceable event identifier
      ['channel_id', channelId],
      ...participants.map(pubkey => ['p', pubkey])
    ],
    content: JSON.stringify({
      channel_id: channelId,
      state_version: 0,
      payload
    }),
    channel_id: channelId,
    state_version: 0,
    payload
  };
}

/**
 * Create unsigned favor_update event
 */
export function createUnsignedFavorUpdateEvent(
  userPubkey: string,
  channelId: string,
  stateVersion: number,
  fromPubkey: string,
  toPubkey: string,
  amount: number,
  description: string,
  favorType: 'debt' | 'credit' | 'settlement' = 'debt'
): UnsignedFavorEvent {
  const timestamp = Math.floor(Date.now() / 1000);

  const payload: FavorUpdatePayload = {
    from_pubkey: fromPubkey,
    to_pubkey: toPubkey,
    amount,
    description,
    timestamp,
    favor_type: favorType
  };

  return {
    kind: FAVOR_EVENT_KINDS.FAVOR_UPDATE,
    pubkey: userPubkey,
    created_at: timestamp,
    tags: [
      ['d', `${channelId}_${stateVersion}`], // replaceable event identifier
      ['channel_id', channelId],
      ['p', fromPubkey],
      ['p', toPubkey],
      ['amount', amount.toString()],
      ['favor_type', favorType]
    ],
    content: JSON.stringify({
      channel_id: channelId,
      state_version: stateVersion,
      payload
    }),
    channel_id: channelId,
    state_version: stateVersion,
    payload
  };
}

/**
 * Create unsigned preapproval event
 */
export function createUnsignedPreapprovalEvent(
  userPubkey: string,
  channelId: string,
  stateVersion: number,
  maxAmount: number,
  expiry: number,
  conditions?: string[],
  autoApprove: boolean = false
): UnsignedFavorEvent {
  const timestamp = Math.floor(Date.now() / 1000);

  const payload: PreapprovalPayload = {
    approver_pubkey: userPubkey,
    max_amount: maxAmount,
    expiry,
    ...(conditions && { conditions }),
    auto_approve: autoApprove
  };

  return {
    kind: FAVOR_EVENT_KINDS.PREAPPROVAL,
    pubkey: userPubkey,
    created_at: timestamp,
    tags: [
      ['d', `${channelId}_preapproval_${stateVersion}`], // replaceable event identifier
      ['channel_id', channelId],
      ['max_amount', maxAmount.toString()],
      ['expiry', expiry.toString()]
    ],
    content: JSON.stringify({
      channel_id: channelId,
      state_version: stateVersion,
      payload
    }),
    channel_id: channelId,
    state_version: stateVersion,
    payload
  };
}

/**
 * Convert unsigned event to Nostr Event format for NIP-46 signing
 */
export function prepareEventForSigning(unsignedEvent: UnsignedFavorEvent): Partial<Event> {
  const { channel_id, state_version, payload, ...nostrEvent } = unsignedEvent;
  
  return {
    ...nostrEvent,
    id: '', // Will be set during signing
    sig: '' // Will be set during signing
  };
}

/**
 * Extract favor event data from signed Nostr event
 */
export function extractFavorEventData(signedEvent: Event): {
  channelId: string;
  stateVersion: number;
  payload: Record<string, any>;
} | null {
  try {
    const content = JSON.parse(signedEvent.content);
    
    if (!content.channel_id || typeof content.state_version !== 'number' || !content.payload) {
      return null;
    }

    return {
      channelId: content.channel_id,
      stateVersion: content.state_version,
      payload: content.payload
    };
  } catch (error) {
    console.error('Failed to extract favor event data:', error);
    return null;
  }
}

/**
 * Generate example unsigned event payloads for testing
 */
export const EXAMPLE_UNSIGNED_EVENTS = {
  CHANNEL_CREATE: {
    description: "Create a new favor channel between two users",
    example: {
      kind: FAVOR_EVENT_KINDS.CHANNEL_CREATE,
      pubkey: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      created_at: 1704067200,
      tags: [
        ["d", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
        ["channel_id", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
        ["p", "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890"],
        ["p", "b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1"]
      ],
      content: JSON.stringify({
        channel_id: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        state_version: 0,
        payload: {
          participants: [
            "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
            "b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1"
          ],
          creation_time: 1704067200,
          channel_name: "Alice & Bob Favor Channel"
        }
      })
    }
  },

  FAVOR_UPDATE: {
    description: "Record a favor transaction between channel participants",
    example: {
      kind: FAVOR_EVENT_KINDS.FAVOR_UPDATE,
      pubkey: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      created_at: 1704067260,
      tags: [
        ["d", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855_1"],
        ["channel_id", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
        ["p", "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890"],
        ["p", "b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1"],
        ["amount", "2"],
        ["favor_type", "debt"]
      ],
      content: JSON.stringify({
        channel_id: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        state_version: 1,
        payload: {
          from_pubkey: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
          to_pubkey: "b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1",
          amount: 2,
          description: "Help with moving apartment",
          timestamp: 1704067260,
          favor_type: "debt"
        }
      })
    }
  },

  PREAPPROVAL: {
    description: "Set preapproval limits for automatic favor processing",
    example: {
      kind: FAVOR_EVENT_KINDS.PREAPPROVAL,
      pubkey: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      created_at: 1704067320,
      tags: [
        ["d", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855_preapproval_1"],
        ["channel_id", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
        ["max_amount", "5"],
        ["expiry", "1704153600"]
      ],
      content: JSON.stringify({
        channel_id: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        state_version: 1,
        payload: {
          approver_pubkey: "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
          max_amount: 5,
          expiry: 1704153600,
          conditions: ["Small household tasks", "Under 2 hours of work"],
          auto_approve: true
        }
      })
    }
  }
} as const;