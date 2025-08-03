import { Event } from 'nostr-tools';

// Mock signing hook for debug/fallback purposes
export function useMockSigning() {
  return {
    isConnected: false,
    userPublicKey: null,
    remoteSignerPublicKey: null,
    clientKeypair: null,
    signEvent: async (unsignedEvent: Partial<Event>): Promise<Event> => {
      throw new Error('Mock signing: Not connected to Amber');
    },
    getPublicKey: async (): Promise<string> => {
      throw new Error('Mock signing: Not connected to Amber');
    },
    encryptMessage: async (recipientPubkey: string, plaintext: string): Promise<string> => {
      throw new Error('Mock signing: Not connected to Amber');
    },
    decryptMessage: async (senderPubkey: string, ciphertext: string): Promise<string> => {
      throw new Error('Mock signing: Not connected to Amber');
    },
    createSignedEvent: async (kind: number, content: string, tags: string[][] = []): Promise<Event> => {
      throw new Error('Mock signing: Not connected to Amber');
    },
    initialize: () => {},
    disconnect: () => {},
    sendRequest: async (method: string, params: any[]): Promise<any> => {
      throw new Error('Mock signing: Not connected to Amber');
    }
  };
}