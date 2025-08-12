import { useState, useEffect, useCallback } from 'react';
import { Filter, Event } from 'nostr-tools';
import { useRelays } from '@/hooks/useRelays';

interface UseNostrEventsReturn {
  events: Event[];
  loading: boolean;
  error: string | null;
  refreshEvents: () => void;
}

export function useNostrEvents(userPublicKey: string | null, kinds: number[] = [1]): UseNostrEventsReturn {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { relays } = useRelays();

  const fetchEvents = useCallback(async () => {
    if (!userPublicKey || userPublicKey.length < 63) {
      console.log('useNostrEvents - Invalid userPublicKey, returning early');
      return;
    }

    // Ensure userPublicKey is padded to 64 characters
    const paddedPublicKey = userPublicKey.length === 63 ? '0' + userPublicKey : userPublicKey;
    console.log('useNostrEvents - Fetching events for:', paddedPublicKey.slice(0, 8) + '...');

    setLoading(true);
    setError(null);

    try {
      const connections = relays.map((relay, index) => {
        console.log(`useNostrEvents - Creating connection ${index} to ${relay}`);
        const ws = new WebSocket(relay);
        return { ws, relay, index };
      });

      const filter: Filter = {
        kinds,
        authors: [paddedPublicKey],
        limit: 20
      };
      
      console.log('useNostrEvents - Using filter:', filter);

      let foundEvents: Event[] = [];
      let connectedRelays = 0;

      const promises = connections.map(({ ws, relay, index }) => {
        return new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.log(`useNostrEvents - Timeout for relay ${index} (${relay})`);
            ws.close();
            resolve();
          }, 10000);

          ws.onopen = () => {
            connectedRelays++;
            console.log(`useNostrEvents - Connected to relay ${index} (${relay}). Total connected: ${connectedRelays}`);
            const reqMessage = JSON.stringify(['REQ', `events-${index}`, filter]);
            console.log(`useNostrEvents - Sending REQ to relay ${index}:`, reqMessage);
            ws.send(reqMessage);
          };

          ws.onmessage = (event) => {
            try {
              const message = JSON.parse(event.data);
              console.log(`useNostrEvents - Message from relay ${index} (${relay}):`, message);
              
              if (message[0] === 'EVENT' && kinds.includes(message[2]?.kind)) {
                const nostrEvent = message[2] as Event;
                console.log(`useNostrEvents - Found event from relay ${index}:`, nostrEvent);
                
                // Only add if we don't already have this event
                if (!foundEvents.some(e => e.id === nostrEvent.id)) {
                  foundEvents.push(nostrEvent);
                  console.log(`useNostrEvents - Added event, total: ${foundEvents.length}`);
                }
              }
              
              if (message[0] === 'EOSE') {
                console.log(`useNostrEvents - EOSE received from relay ${index} (${relay})`);
                clearTimeout(timeout);
                ws.close();
                resolve();
              }
              
              if (message[0] === 'NOTICE') {
                console.log(`useNostrEvents - NOTICE from relay ${index} (${relay}):`, message[1]);
              }
            } catch (err) {
              console.error(`useNostrEvents - Error parsing message from relay ${index}:`, err, 'raw message:', event.data);
            }
          };

          ws.onerror = (error) => {
            console.error(`useNostrEvents - WebSocket error for relay ${index} (${relay}):`, error);
            clearTimeout(timeout);
            resolve();
          };

          ws.onclose = (event) => {
            console.log(`useNostrEvents - Connection closed for relay ${index} (${relay}):`, event.code, event.reason);
            clearTimeout(timeout);
            resolve();
          };
        });
      });

      await Promise.all(promises);

      // Sort events by created_at (newest first)
      foundEvents.sort((a, b) => b.created_at - a.created_at);
      
      console.log(`useNostrEvents - Final events count: ${foundEvents.length}`);
      setEvents(foundEvents);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(errorMessage);
      console.error('Events fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userPublicKey, kinds, relays]);

  const refreshEvents = useCallback(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (userPublicKey) {
      fetchEvents();
    }
  }, [userPublicKey, fetchEvents]);

  return {
    events,
    loading,
    error,
    refreshEvents
  };
}