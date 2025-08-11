import { useState, useEffect, useCallback } from 'react';
import { Filter, Event } from 'nostr-tools';
import { useToast } from '@/hooks/use-toast';

interface NostrProfile {
  name?: string;
  about?: string;
  picture?: string;
  banner?: string;
  website?: string;
  nip05?: string;
  location?: string;
  lud16?: string;
  display_name?: string;
}

interface UseNostrProfileReturn {
  profile: NostrProfile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (profile: NostrProfile, signEvent: (event: Partial<Event>) => Promise<Event>) => Promise<void>;
  refreshProfile: () => void;
}

const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.nostr.band'
];

export function useNostrProfile(userPublicKey: string | null): UseNostrProfileReturn {
  const [profile, setProfile] = useState<NostrProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchProfile = useCallback(async () => {
    if (!userPublicKey || userPublicKey.length < 63) return;

    // Ensure userPublicKey is padded to 64 characters
    const paddedPublicKey = userPublicKey.length === 63 ? '0' + userPublicKey : userPublicKey;

    setLoading(true);
    setError(null);

    try {
      // Connect to multiple relays and fetch profile
      const connections = RELAYS.map(relay => {
        const ws = new WebSocket(relay);
        return ws;
      });

      const filter: Filter = {
        kinds: [0],
        authors: [paddedPublicKey],
        limit: 1
      };

      let profileFound = false;

      const promises = connections.map(ws => {
        return new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            ws.close();
            resolve();
          }, 5000);

          ws.onopen = () => {
            ws.send(JSON.stringify(['REQ', 'profile', filter]));
          };

          ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              
              if (message[0] === 'EVENT' && message[2]?.kind === 0) {
                const profileEvent = message[2] as Event;
                const profileData = JSON.parse(profileEvent.content) as NostrProfile;
                
                if (!profileFound) {
                  profileFound = true;
                  setProfile(profileData);
                }
              }
              
              if (message[0] === 'EOSE') {
                clearTimeout(timeout);
                ws.close();
                resolve();
              }
            } catch (err) {
              console.error('Error parsing message:', err);
            }
          };

          ws.onerror = () => {
            clearTimeout(timeout);
            resolve();
          };
        });
      });

      await Promise.all(promises);

      if (!profileFound) {
        // Check localStorage as fallback
        const savedProfile = localStorage.getItem(`nostr-profile-${paddedPublicKey}`);
        if (savedProfile) {
          try {
            setProfile(JSON.parse(savedProfile));
          } catch (err) {
            console.error('Failed to parse saved profile:', err);
          }
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile';
      setError(errorMessage);
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userPublicKey]);

  const updateProfile = useCallback(async (
    newProfile: NostrProfile, 
    signEvent: (event: Partial<Event>) => Promise<Event>
  ) => {
    if (!userPublicKey || userPublicKey.length < 63) throw new Error('No user public key available');
    
    // Ensure userPublicKey is padded to 64 characters
    const paddedPublicKey = userPublicKey.length === 63 ? '0' + userPublicKey : userPublicKey;

    try {
      // Create kind 0 event for profile update
      const unsignedEvent: Partial<Event> = {
        kind: 0,
        content: JSON.stringify(newProfile),
        tags: [],
        created_at: Math.floor(Date.now() / 1000),
        pubkey: paddedPublicKey,
      };

      // Sign the event
      const signedEvent = await signEvent(unsignedEvent);

      // Publish to relays
      const connections = RELAYS.map(relay => new WebSocket(relay));
      
      const publishPromises = connections.map(ws => {
        return new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            ws.close();
            resolve();
          }, 5000);

          ws.onopen = () => {
            ws.send(JSON.stringify(['EVENT', signedEvent]));
            setTimeout(() => {
              clearTimeout(timeout);
              ws.close();
              resolve();
            }, 1000);
          };

          ws.onerror = () => {
            clearTimeout(timeout);
            resolve();
          };
        });
      });

      await Promise.all(publishPromises);

      // Update local state and storage
      setProfile(newProfile);
      localStorage.setItem(`nostr-profile-${paddedPublicKey}`, JSON.stringify(newProfile));

      toast({
        title: "Profile Updated",
        description: "Your profile has been published to the Nostr network!",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      toast({
        title: "Profile Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  }, [userPublicKey, toast]);

  const refreshProfile = useCallback(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (userPublicKey) {
      fetchProfile();
    }
  }, [userPublicKey, fetchProfile]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    refreshProfile
  };
}