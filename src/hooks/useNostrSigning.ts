import { useState, useCallback } from 'react';
import { Event, getEventHash } from 'nostr-tools';
import { useToast } from '@/hooks/use-toast';

interface SigningRequest {
  id: string;
  method: string;
  params: any[];
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

interface NostrSigningState {
  isConnected: boolean;
  userPublicKey: string | null;
  remoteSignerPublicKey: string | null;
  clientKeypair: { privateKey: Uint8Array; publicKey: string } | null;
}

export function useNostrSigning() {
  const { toast } = useToast();
  const [state, setState] = useState<NostrSigningState>(() => {
    // Load from localStorage if available
    const savedUserPubkey = localStorage.getItem('nostr-user-public-key');
    const savedRemoteSignerPubkey = localStorage.getItem('nostr-remote-signer-pubkey');
    const savedClientKeypair = localStorage.getItem('nostr-client-keypair');
    
    return {
      isConnected: !!(savedUserPubkey && savedRemoteSignerPubkey),
      userPublicKey: savedUserPubkey,
      remoteSignerPublicKey: savedRemoteSignerPubkey,
      clientKeypair: savedClientKeypair ? JSON.parse(savedClientKeypair) : null,
    };
  });

  const [pendingRequests] = useState<Map<string, SigningRequest>>(new Map());
  const [relayConnection] = useState<WebSocket[]>([]);

  const generateRequestId = () => Math.random().toString(36).substring(2, 15);

  const connectToRelays = useCallback(async (relays: string[]) => {
    // Connect to relays for NIP-46 communication
    const connections = relays.map(relay => {
      const ws = new WebSocket(relay);
      ws.onopen = () => console.log(`Connected to relay: ${relay}`);
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message[0] === 'EVENT' && message[2]?.kind === 24133) {
            handleNostrResponse(message[2]);
          }
        } catch (error) {
          console.error('Error parsing relay message:', error);
        }
      };
      return ws;
    });
    
    relayConnection.splice(0, relayConnection.length, ...connections);
  }, [relayConnection]);

  const handleNostrResponse = useCallback(async (event: Event) => {
    if (!state.clientKeypair || !state.remoteSignerPublicKey) return;

    try {
      // Decrypt the response content - simplified for demo
      // In production, use proper NIP-44 decryption with conversation key
      const decryptedContent = event.content; // For now, assume unencrypted for demo
      
      const response = JSON.parse(decryptedContent);
      
      // Handle the response
      const request = pendingRequests.get(response.id);
      if (request) {
        pendingRequests.delete(response.id);
        
        if (response.error) {
          request.reject(new Error(response.error));
        } else {
          request.resolve(response.result);
        }
      }
    } catch (error) {
      console.error('Failed to handle nostr response:', error);
    }
  }, [state.clientKeypair, state.remoteSignerPublicKey, pendingRequests]);

  const sendRequest = useCallback(async (method: string, params: any[]): Promise<any> => {
    if (!state.isConnected || !state.clientKeypair || !state.remoteSignerPublicKey) {
      throw new Error('Not connected to remote signer');
    }

    const requestId = generateRequestId();
    const request = {
      id: requestId,
      method,
      params
    };

    // Encrypt the request - simplified for demo
    // In production, use proper NIP-44 encryption with conversation key
    const encryptedContent = JSON.stringify(request); // For now, assume unencrypted for demo

    // Create the event
    const event: Partial<Event> = {
      kind: 24133,
      pubkey: state.clientKeypair.publicKey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['p', state.remoteSignerPublicKey]],
      content: encryptedContent,
    };

    event.id = getEventHash(event as Event);

    // Send to all connected relays
    const eventMessage = ['EVENT', event];
    relayConnection.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(eventMessage));
      }
    });

    // Return a promise that resolves when we get the response
    return new Promise((resolve, reject) => {
      pendingRequests.set(requestId, {
        id: requestId,
        method,
        params,
        resolve,
        reject
      });

      // Set a timeout
      setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000); // 30 second timeout
    });
  }, [state, relayConnection, pendingRequests]);

  const signEvent = useCallback(async (unsignedEvent: Partial<Event>): Promise<Event> => {
    try {
      toast({
        title: "Signing Event",
        description: "Please approve the signing request in Amber...",
      });

      // Remove id and sig from the event before sending to signer
      const { id, sig, ...eventToSign } = unsignedEvent as any;
      
      const signedEventJson = await sendRequest('sign_event', [eventToSign]);
      const signedEvent = JSON.parse(signedEventJson);

      toast({
        title: "Event Signed",
        description: "Successfully signed event with remote signer",
      });

      return signedEvent;
    } catch (error) {
      toast({
        title: "Signing Failed",
        description: error instanceof Error ? error.message : "Failed to sign event",
        variant: "destructive",
      });
      throw error;
    }
  }, [sendRequest, toast]);

  const getPublicKey = useCallback(async (): Promise<string> => {
    try {
      const pubkey = await sendRequest('get_public_key', []);
      return pubkey;
    } catch (error) {
      console.error('Failed to get public key:', error);
      throw error;
    }
  }, [sendRequest]);

  const encryptMessage = useCallback(async (recipientPubkey: string, plaintext: string): Promise<string> => {
    try {
      const ciphertext = await sendRequest('nip44_encrypt', [recipientPubkey, plaintext]);
      return ciphertext;
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      throw error;
    }
  }, [sendRequest]);

  const decryptMessage = useCallback(async (senderPubkey: string, ciphertext: string): Promise<string> => {
    try {
      const plaintext = await sendRequest('nip44_decrypt', [senderPubkey, ciphertext]);
      return plaintext;
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      throw error;
    }
  }, [sendRequest]);

  const createSignedEvent = useCallback(async (kind: number, content: string, tags: string[][] = []): Promise<Event> => {
    if (!state.userPublicKey) {
      throw new Error('User public key not available');
    }

    const unsignedEvent: Partial<Event> = {
      kind,
      content,
      tags,
      created_at: Math.floor(Date.now() / 1000),
      pubkey: state.userPublicKey.startsWith('npub') 
        ? state.userPublicKey.slice(4) // Remove npub prefix if present
        : state.userPublicKey,
    };

    return await signEvent(unsignedEvent);
  }, [state.userPublicKey, signEvent]);

  const initialize = useCallback((userPubkey: string, remoteSignerPubkey: string, clientKeypair: any) => {
    setState({
      isConnected: true,
      userPublicKey: userPubkey,
      remoteSignerPublicKey: remoteSignerPubkey,
      clientKeypair
    });

    // Initialize relay connections
    connectToRelays(['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net']);
  }, [connectToRelays]);

  const disconnect = useCallback(() => {
    // Close relay connections
    relayConnection.forEach(ws => ws.close());
    relayConnection.length = 0;

    // Clear pending requests
    pendingRequests.clear();

    // Clear state and localStorage
    setState({
      isConnected: false,
      userPublicKey: null,
      remoteSignerPublicKey: null,
      clientKeypair: null
    });

    localStorage.removeItem('nostr-user-public-key');
    localStorage.removeItem('nostr-remote-signer-pubkey');
    localStorage.removeItem('nostr-client-keypair');
  }, [relayConnection, pendingRequests]);

  return {
    ...state,
    signEvent,
    getPublicKey,
    encryptMessage,
    decryptMessage,
    createSignedEvent,
    initialize,
    disconnect,
    sendRequest
  };
}