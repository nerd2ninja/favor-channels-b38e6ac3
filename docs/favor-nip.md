# NIP-XX: Favor Tracking Events

## Abstract

This NIP defines a protocol for tracking favors between users on the Nostr network. It allows users to create, manage, and verify favor obligations using cryptographically signed events that require dual signatures for validation.

## Motivation

Social networks often involve informal favor exchanges between users. This NIP provides a decentralized way to track these obligations, creating transparency and accountability while maintaining the decentralized nature of Nostr.

## Specification

### Event Structure

Favor events use kind `3100` and follow this structure:

```json
{
  "kind": 3100,
  "content": "<encrypted favor details>",
  "tags": [
    ["favor_type", "<tiny|small|regular|big|huge>"],
    ["amount", "<number>"],
    ["direction", "<owe|owed>"],
    ["counterparty", "<npub>"],
    ["status", "<proposed|confirmed|completed>"],
    ["favor_id", "<unique_id>"],
    ["requires_signature", "<npub>"] // Who needs to co-sign
  ],
  "created_at": <timestamp>,
  "pubkey": "<proposer_pubkey>",
  "id": "<event_id>",
  "sig": "<signature>"
}
```

### Favor Types and Hierarchy

The system defines five favor levels with configurable conversion rates:

1. **tiny**: The smallest favor unit
2. **small**: Multiple tiny favors
3. **regular**: Multiple small favors  
4. **big**: Multiple regular favors
5. **huge**: Multiple big favors

Default conversion rates (customizable per user):
- 5 tiny = 1 small
- 3 small = 1 regular  
- 2 regular = 1 big
- 2 big = 1 huge

### Dual Signature Requirement

For a favor to be considered valid:

1. The proposer creates and signs the initial event with `status: "proposed"`
2. The counterparty must create a confirmation event referencing the original:

```json
{
  "kind": 3101,
  "content": "<confirmation_message>",
  "tags": [
    ["e", "<original_favor_event_id>"],
    ["p", "<original_proposer_pubkey>"],
    ["favor_confirmed", "true"]
  ],
  "created_at": <timestamp>,
  "pubkey": "<counterparty_pubkey>",
  "id": "<confirmation_event_id>", 
  "sig": "<signature>"
}
```

### Favor Network Routing

For routing favors through a network (similar to Lightning Network):

```json
{
  "kind": 3102,
  "content": "<routing_details>",
  "tags": [
    ["route_id", "<unique_route_id>"],
    ["route_step", "<step_number>"],
    ["from", "<npub>"],
    ["to", "<npub>"],
    ["final_destination", "<npub>"],
    ["favor_type", "<type>"],
    ["amount", "<number>"]
  ],
  "created_at": <timestamp>,
  "pubkey": "<current_step_pubkey>",
  "id": "<event_id>",
  "sig": "<signature>"
}
```

### Merkle Tree Validation

For complex routing chains, a merkle tree of all route events is created:

```json
{
  "kind": 3103,
  "content": "<merkle_root>",
  "tags": [
    ["route_id", "<route_id>"],
    ["merkle_root", "<root_hash>"],
    ["route_events", "<event_id_1>", "<event_id_2>", "..."]
  ],
  "created_at": <timestamp>
}
```

## Implementation Notes

### Client Requirements

- Clients MUST validate dual signatures before showing favors as confirmed
- Clients SHOULD implement favor type conversion rates
- Clients MAY implement routing algorithms for favor networks
- Clients SHOULD use NIP-46 for signing when available

### Relay Behavior

- Relays SHOULD index favor events by counterparty tags
- Relays MAY implement favor-specific filtering
- Relays SHOULD preserve all favor events for audit trails

### Security Considerations

- All favor events MUST be signed by the appropriate parties
- Clients SHOULD verify the cryptographic integrity of favor chains
- Routing events MUST be validated in sequence
- Merkle trees SHOULD be verified before accepting complex routes

## Examples

### Basic Favor Proposal

```json
{
  "kind": 3100,
  "content": "Help move furniture this weekend",
  "tags": [
    ["favor_type", "big"],
    ["amount", "1"],
    ["direction", "owed"],
    ["counterparty", "npub1abc..."],
    ["status", "proposed"],
    ["favor_id", "uuid-123"],
    ["requires_signature", "npub1abc..."]
  ],
  "created_at": 1703123456,
  "pubkey": "xyz789...",
  "id": "event123...",
  "sig": "sig123..."
}
```

### Favor Confirmation

```json
{
  "kind": 3101,
  "content": "Confirmed - I'll help you move",
  "tags": [
    ["e", "event123..."],
    ["p", "xyz789..."],
    ["favor_confirmed", "true"]
  ],
  "created_at": 1703123500,
  "pubkey": "abc456...",
  "id": "confirm123...",
  "sig": "confirmsig..."
}
```

## Future Extensions

- Integration with Lightning Network for monetary settlements
- Reputation scoring based on favor completion rates
- Automated favor matching algorithms
- Time-based favor expiration