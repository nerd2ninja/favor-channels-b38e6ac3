
import { useState, useEffect, useCallback, useRef } from 'react';
import { Filter, Event } from 'nostr-tools';
import { useRelays } from '@/hooks/useRelays';

interface UseNostrEventsReturn {
  events: Event[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  refreshEvents: () => void;
  loadMoreEvents: () => void;
  hasMore: boolean;
}

export function useNostrEvents(userPublicKey: string | null, kinds: number[] = [1]): UseNostrEventsReturn {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const { relays } = useRelays();
  const loadedEventIds = useRef(new Set<string>());
  const oldestTimestamp = useRef<number | null>(null);

  const fetchEvents = useCallback(async (isLoadingMore = false, until?: number) => {
    console.log('useNostrEvents - fetchEvents called:', { userPublicKey, isLoadingMore, until });
    
    if (!userPublicKey || userPublicKey.length < 63) {
      console.log('useNostrEvents - Invalid userPublicKey, returning early');
      setLoading(false);
      setLoadingMore(false);
      return;
    }

    // Ensure userPublicKey is padded to 64 characters
    const paddedPublicKey = userPublicKey.length === 63 ? '0' + userPublicKey : userPublicKey;
    console.log('useNostrEvents - Fetching events for:', paddedPublicKey.slice(0, 8) + '...');

    if (isLoadingMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      console.log('useNostrEvents - Fresh load: resetting state');
      setEvents([]);
      loadedEventIds.current.clear();
      oldestTimestamp.current = null;
    }
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

      // Add until filter for pagination
      if (until) {
        filter.until = until;
      }
      
      console.log('useNostrEvents - Using filter:', filter);

      let foundEvents: Event[] = [];
      let connectedRelays = 0;
      let completedConnections = 0;
      const totalConnections = connections.length;

      const promises = connections.map(({ ws, relay, index }) => {
        return new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            console.log(`useNostrEvents - Timeout for relay ${index} (${relay})`);
            ws.close();
            completedConnections++;
            
            // Stop loading once all connections are done
            if (completedConnections === totalConnections) {
              setLoading(false);
              setLoadingMore(false);
              if (connectedRelays === 0) {
                setError('Unable to connect to any Nostr relays');
              }
            }
            resolve();
          }, 3000); // Further reduced timeout

          ws.onopen = () => {
            connectedRelays++;
            console.log(`useNostrEvents - Connected to relay ${index} (${relay}). Total connected: ${connectedRelays}`);
            const reqMessage = JSON.stringify(['REQ', `events-${index}-${Date.now()}`, filter]);
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
                if (!loadedEventIds.current.has(nostrEvent.id)) {
                  foundEvents.push(nostrEvent);
                  loadedEventIds.current.add(nostrEvent.id);
                  console.log(`useNostrEvents - Added event, total: ${foundEvents.length}`);
                  
                  // Update oldest timestamp
                  if (!oldestTimestamp.current || nostrEvent.created_at < oldestTimestamp.current) {
                    oldestTimestamp.current = nostrEvent.created_at;
                  }

                  // Update events immediately to show them as they arrive
                  const sortedEvents = [...foundEvents].sort((a, b) => b.created_at - a.created_at);
                  
                  if (isLoadingMore) {
                    setEvents(prev => {
                      const combined = [...prev, ...sortedEvents];
                      const unique = combined.filter((event, index, arr) => 
                        arr.findIndex(e => e.id === event.id) === index
                      );
                      return unique.sort((a, b) => b.created_at - a.created_at);
                    });
                  } else {
                    setEvents(sortedEvents);
                  }
                }
              }
              
              if (message[0] === 'EOSE') {
                console.log(`useNostrEvents - EOSE received from relay ${index} (${relay})`);
                clearTimeout(timeout);
                ws.close();
                completedConnections++;
                
                // Stop loading once all connections are done
                if (completedConnections === totalConnections) {
                  setLoading(false);
                  setLoadingMore(false);
                }
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
            if (ws.readyState !== WebSocket.CLOSED) {
              ws.close();
            }
            completedConnections++;
            
            // Immediately stop loading if all connections have failed
            if (completedConnections === totalConnections) {
              setLoading(false);
              setLoadingMore(false);
              if (connectedRelays === 0) {
                setError('Unable to connect to any Nostr relays');
              }
            }
            resolve();
          };

          ws.onclose = (event) => {
            console.log(`useNostrEvents - Connection closed for relay ${index} (${relay}):`, event.code, event.reason);
            clearTimeout(timeout);
            completedConnections++;
            
            // Stop loading once all connections are done
            if (completedConnections === totalConnections) {
              setLoading(false);
              setLoadingMore(false);
            }
            resolve();
          };
        });
      });

      await Promise.all(promises);

      // Final sort and check for more events
      if (foundEvents.length > 0) {
        foundEvents.sort((a, b) => b.created_at - a.created_at);
        console.log(`useNostrEvents - Final events count: ${foundEvents.length}`);
        
        // Final update if we haven't already updated
        if (isLoadingMore) {
          setEvents(prev => {
            const combined = [...prev, ...foundEvents];
            const unique = combined.filter((event, index, arr) => 
              arr.findIndex(e => e.id === event.id) === index
            );
            return unique.sort((a, b) => b.created_at - a.created_at);
          });
        } else {
          setEvents(foundEvents);
        }
      }

      // Check if we have more events to load
      setHasMore(foundEvents.length === 20);

      // If no relays connected, show error
      if (connectedRelays === 0) {
        setError('Unable to connect to any Nostr relays');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(errorMessage);
      console.error('Events fetch error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userPublicKey, kinds, relays]); // Remove events dependency to prevent infinite loop

  const refreshEvents = useCallback(() => {
    console.log('useNostrEvents - refreshEvents called');
    setEvents([]);
    loadedEventIds.current.clear();
    oldestTimestamp.current = null;
    fetchEvents(false);
  }, [userPublicKey, kinds, relays]); // Use same deps as fetchEvents

  const loadMoreEvents = useCallback(() => {
    if (loadingMore || !hasMore || !oldestTimestamp.current) return;
    fetchEvents(true, oldestTimestamp.current - 1);
  }, [loadingMore, hasMore, userPublicKey, kinds, relays]); // Use same deps as fetchEvents

  useEffect(() => {
    console.log('useNostrEvents - useEffect triggered:', { userPublicKey });
    if (userPublicKey) {
      console.log('useNostrEvents - Calling fetchEvents from useEffect');
      fetchEvents(false);
    }
  }, [userPublicKey, kinds, relays]); // Remove fetchEvents from dependencies

  return {
    events,
    loading,
    loadingMore,
    error,
    refreshEvents,
    loadMoreEvents,
    hasMore
  };
}
