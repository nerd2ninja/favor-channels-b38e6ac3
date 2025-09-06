import { useState, useCallback } from 'react';
import { Event, getEventHash, nip19 } from 'nostr-tools';
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
  const [relayConnections, setRelayConnections] = useState<WebSocket[]>([]);

  const generateRequestId = () => Math.random().toString(36).substring(2, 15);


  const connectToRelays = useCallback(async (relays: string[]) => {
    console.log('useNostrSigning - Connecting to relays for NIP-46:', relays);
    
    // Connect to relays for NIP-46 communication
    const connections = relays.map(relay => {
      const ws = new WebSocket(relay);
      
      ws.onopen = () => {
        console.log(`useNostrSigning - Connected to relay: ${relay}`);
        // Wait a moment then subscribe to events for our client pubkey
        setTimeout(() => {
          if (state.clientKeypair?.publicKey && ws.readyState === WebSocket.OPEN) {
            const sub = ['REQ', 'nip46-sub', {
              kinds: [24133],
              '#p': [state.clientKeypair.publicKey],
              since: Math.floor(Date.now() / 1000)
            }];
            ws.send(JSON.stringify(sub));
            console.log(`useNostrSigning - Subscribed to NIP-46 events on ${relay}`);
          }
        }, 1000);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message[0] === 'EVENT' && message[2]?.kind === 24133) {
            console.log('useNostrSigning - Received NIP-46 response:', message[2]);
            handleNostrResponse(message[2]);
          }
        } catch (error) {
          console.error('Error parsing relay message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error(`WebSocket error for ${relay}:`, error);
      };
      
      ws.onclose = (event) => {
        console.log(`useNostrSigning - Disconnected from relay: ${relay}, code: ${event.code}, reason: ${event.reason}`);
      };
      
      return ws;
    });
    
    setRelayConnections(connections);
  }, [state.clientKeypair]);

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
    console.log('useNostrSigning - Sending NIP-46 request to relays:', event);
    
    let sentToRelays = 0;
    relayConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(eventMessage));
        sentToRelays++;
      }
    });
    
    console.log(`useNostrSigning - Sent request to ${sentToRelays} relays`);
    
    if (sentToRelays === 0) {
      throw new Error('No relay connections available');
    }

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
  }, [state, relayConnections, pendingRequests]);

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
    console.log('useNostrSigning - createSignedEvent called with userPublicKey:', state.userPublicKey, 'length:', state.userPublicKey?.length);
    
    if (!state.userPublicKey) {
      throw new Error('User public key not available');
    }

    // Handle both npub and hex formats
    let hexPubkey = state.userPublicKey;
    if (state.userPublicKey.startsWith('npub')) {
      try {
        hexPubkey = nip19.decode(state.userPublicKey).data as string;
        console.log('useNostrSigning - decoded npub to hex:', hexPubkey, 'length:', hexPubkey?.length);
      } catch (error) {
        console.error('useNostrSigning - Error decoding npub:', error);
        throw new Error('Invalid npub format');
      }
    }
    
    // Ensure hex key is 64 characters
    if (hexPubkey.length === 63) {
      hexPubkey = '0' + hexPubkey;
      console.log('useNostrSigning - padded hex key:', hexPubkey, 'length:', hexPubkey.length);
    }

    const unsignedEvent: Partial<Event> = {
      kind,
      content,
      tags,
      created_at: Math.floor(Date.now() / 1000),
      pubkey: hexPubkey,
    };

    console.log('useNostrSigning - unsignedEvent pubkey:', unsignedEvent.pubkey, 'length:', unsignedEvent.pubkey?.length);
    return await signEvent(unsignedEvent);
  }, [state.userPublicKey, signEvent]);

  const initialize = useCallback((userPubkey: string, remoteSignerPubkey: string, clientKeypair: any) => {
    console.log('useNostrSigning - Initializing with:', { userPubkey, remoteSignerPubkey, hasKeypair: !!clientKeypair });
    
    setState({
      isConnected: true,
      userPublicKey: userPubkey,
      remoteSignerPublicKey: remoteSignerPubkey,
      clientKeypair
    });

    // Use a timeout to ensure state is set before connecting to relays
    setTimeout(() => {
      connectToRelays([
        'wss://relay.nostr.band', 
        'wss://nostr.wine', 
        'wss://relay.snort.social'
      ]);
    }, 500);
  }, [connectToRelays]);

  const disconnect = useCallback(() => {
    // Close relay connections
    relayConnections.forEach(ws => ws.close());
    setRelayConnections([]);

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
  }, [relayConnections, pendingRequests]);

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