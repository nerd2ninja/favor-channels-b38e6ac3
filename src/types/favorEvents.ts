import { Event } from 'nostr-tools';

// Favor Channels Event Kinds
export const FAVOR_EVENT_KINDS = {
  CHANNEL_CREATE: 30100,
  FAVOR_UPDATE: 30101,
  PREAPPROVAL: 30102
} as const;

export type FavorEventKind = typeof FAVOR_EVENT_KINDS[keyof typeof FAVOR_EVENT_KINDS];

// Base Favor Event Structure
export interface BaseFavorEvent {
  kind: number;
  channel_id: string;
  state_version: number;
  payload: Record<string, any>;
  signatures: EventSignature[];
}

export interface EventSignature {
  pubkey: string; // hex format
  sig: string;    // hex format
}

// Channel Create Event
export interface ChannelCreatePayload {
  participants: string[]; // array of pubkeys in hex
  creation_time: number;
  channel_name?: string;
  metadata?: Record<string, any>;
}

export interface ChannelCreateEvent extends BaseFavorEvent {
  kind: typeof FAVOR_EVENT_KINDS.CHANNEL_CREATE;
  payload: ChannelCreatePayload;
}

// Favor Update Event
export interface FavorUpdatePayload {
  from_pubkey: string;
  to_pubkey: string;
  amount: number;
  description: string;
  timestamp: number;
  favor_type?: 'debt' | 'credit' | 'settlement';
}

export interface FavorUpdateEvent extends BaseFavorEvent {
  kind: typeof FAVOR_EVENT_KINDS.FAVOR_UPDATE;
  payload: FavorUpdatePayload;
}

// Preapproval Event
export interface PreapprovalPayload {
  approver_pubkey: string;
  max_amount: number;
  expiry: number;
  conditions?: string[];
  auto_approve?: boolean;
}

export interface PreapprovalEvent extends BaseFavorEvent {
  kind: typeof FAVOR_EVENT_KINDS.PREAPPROVAL;
  payload: PreapprovalPayload;
}

// Union type for all favor events
export type FavorEvent = ChannelCreateEvent | FavorUpdateEvent | PreapprovalEvent;

// Unsigned event structure for NIP-46 signing
export interface UnsignedFavorEvent extends Omit<Event, 'id' | 'sig'> {
  channel_id: string;
  state_version: number;
  payload: Record<string, any>;
}

// JSON Schemas for validation
export const FAVOR_EVENT_SCHEMAS = {
  CHANNEL_CREATE: {
    type: "object",
    required: ["kind", "channel_id", "state_version", "payload"],
    properties: {
      kind: { const: FAVOR_EVENT_KINDS.CHANNEL_CREATE },
      channel_id: { type: "string", pattern: "^[a-fA-F0-9]{64}$" },
      state_version: { type: "integer", minimum: 0 },
      payload: {
        type: "object",
        required: ["participants", "creation_time"],
        properties: {
          participants: {
            type: "array",
            items: { type: "string", pattern: "^[a-fA-F0-9]{64}$" },
            minItems: 2
          },
          creation_time: { type: "integer" },
          channel_name: { type: "string" },
          metadata: { type: "object" }
        }
      },
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
  },
  
  FAVOR_UPDATE: {
    type: "object",
    required: ["kind", "channel_id", "state_version", "payload"],
    properties: {
      kind: { const: FAVOR_EVENT_KINDS.FAVOR_UPDATE },
      channel_id: { type: "string", pattern: "^[a-fA-F0-9]{64}$" },
      state_version: { type: "integer", minimum: 0 },
      payload: {
        type: "object",
        required: ["from_pubkey", "to_pubkey", "amount", "description", "timestamp"],
        properties: {
          from_pubkey: { type: "string", pattern: "^[a-fA-F0-9]{64}$" },
          to_pubkey: { type: "string", pattern: "^[a-fA-F0-9]{64}$" },
          amount: { type: "number", minimum: 0 },
          description: { type: "string" },
          timestamp: { type: "integer" },
          favor_type: { enum: ["debt", "credit", "settlement"] }
        }
      }
    }
  },

  PREAPPROVAL: {
    type: "object",
    required: ["kind", "channel_id", "state_version", "payload"],
    properties: {
      kind: { const: FAVOR_EVENT_KINDS.PREAPPROVAL },
      channel_id: { type: "string", pattern: "^[a-fA-F0-9]{64}$" },
      state_version: { type: "integer", minimum: 0 },
      payload: {
        type: "object",
        required: ["approver_pubkey", "max_amount", "expiry"],
        properties: {
          approver_pubkey: { type: "string", pattern: "^[a-fA-F0-9]{64}$" },
          max_amount: { type: "number", minimum: 0 },
          expiry: { type: "integer" },
          conditions: { 
            type: "array", 
            items: { type: "string" } 
          },
          auto_approve: { type: "boolean" }
        }
      }
    }
  }
} as const;