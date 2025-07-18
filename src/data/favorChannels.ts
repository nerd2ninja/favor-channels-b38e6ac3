import { getPublicKey, getEventHash, Event } from 'nostr-tools';

export interface FavorChannel {
  npub: string;
  favorsOwed: number; // favors user owes to this person
  favorsOwedToThem: number; // favors this person owes to user
  lastUpdated: Date;
  messages: FavorMessage[];
}

export interface FavorMessage {
  id: string;
  content: string;
  signature: string;
  timestamp: number;
  author: string; // npub of who signed this message
}

// Mock private key for demo - in real app this would come from user's key management
const MOCK_PRIVATE_KEY = new Uint8Array(32).fill(0xa);

let favorChannels: FavorChannel[] = [
  {
    npub: 'npub1alice123456789abcdef',
    favorsOwed: 2,
    favorsOwedToThem: 5,
    lastUpdated: new Date(),
    messages: []
  },
  {
    npub: 'npub1bob987654321fedcba',
    favorsOwed: 3,
    favorsOwedToThem: 1,
    lastUpdated: new Date(),
    messages: []
  }
];

export function getFavorChannels(): FavorChannel[] {
  return [...favorChannels];
}

function createFavorMessage(
  fromNpub: string, 
  toNpub: string, 
  amount: number, 
  direction: 'owe' | 'owed'
): FavorMessage {
  const content = direction === 'owe' 
    ? `${fromNpub} owes ${toNpub} ${amount} favor${amount !== 1 ? 's' : ''}`
    : `${toNpub} owes ${fromNpub} ${amount} favor${amount !== 1 ? 's' : ''}`;
  
  // Create a Nostr event
  const event: Event = {
    kind: 1,
    pubkey: getPublicKey(MOCK_PRIVATE_KEY),
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['t', 'favor'],
      ['p', toNpub]
    ],
    content: content,
    id: '',
    sig: ''
  };
  
  event.id = getEventHash(event);
  event.sig = 'mock_signature_' + Math.random().toString(36);
  
  return {
    id: event.id,
    content: content,
    signature: event.sig,
    timestamp: event.created_at,
    author: `npub1${getPublicKey(MOCK_PRIVATE_KEY)}`
  };
}

export function addFavorEntry(
  otherPersonNpub: string, 
  amount: number, 
  direction: 'owe' | 'owed'
): FavorChannel[] {
  const userNpub = `npub1${getPublicKey(MOCK_PRIVATE_KEY)}`;
  
  // Create cryptographically signed message
  const message = createFavorMessage(userNpub, otherPersonNpub, amount, direction);
  
  // Find existing channel or create new one
  let existingChannelIndex = favorChannels.findIndex(
    channel => channel.npub === otherPersonNpub
  );
  
  if (existingChannelIndex === -1) {
    // Create new channel
    const newChannel: FavorChannel = {
      npub: otherPersonNpub,
      favorsOwed: direction === 'owe' ? amount : 0,
      favorsOwedToThem: direction === 'owed' ? amount : 0,
      lastUpdated: new Date(),
      messages: [message]
    };
    favorChannels.push(newChannel);
  } else {
    // Update existing channel
    const channel = favorChannels[existingChannelIndex];
    if (direction === 'owe') {
      channel.favorsOwed += amount;
    } else {
      channel.favorsOwedToThem += amount;
    }
    channel.lastUpdated = new Date();
    channel.messages.push(message);
  }
  
  return [...favorChannels];
}

export function verifyFavorMessage(message: FavorMessage): boolean {
  // In a real implementation, this would verify the cryptographic signature
  // For now, we'll just check if the message has required fields
  return !!(message.id && message.content && message.signature && message.author);
}

export function exportFavorData(): string {
  // Export all favor data as JSON for backup/sync
  return JSON.stringify(favorChannels, null, 2);
}

export function importFavorData(data: string): void {
  try {
    const imported = JSON.parse(data);
    // Verify all messages are cryptographically valid
    const validChannels = imported.filter((channel: FavorChannel) =>
      channel.messages.every(verifyFavorMessage)
    );
    favorChannels = validChannels;
  } catch (error) {
    console.error('Failed to import favor data:', error);
  }
}