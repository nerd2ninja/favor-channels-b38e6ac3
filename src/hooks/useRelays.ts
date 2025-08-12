import { useState, useEffect, useCallback } from 'react';

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.primal.net',
  'wss://relay.nostr.band'
];

export function useRelays() {
  const [relays, setRelays] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nostr-relays');
      return saved ? JSON.parse(saved) : DEFAULT_RELAYS;
    } catch (error) {
      console.error('Failed to load relays from localStorage:', error);
      return DEFAULT_RELAYS;
    }
  });

  // Save relays to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('nostr-relays', JSON.stringify(relays));
    } catch (error) {
      console.error('Failed to save relays to localStorage:', error);
    }
  }, [relays]);

  const addRelay = useCallback((relay: string) => {
    const normalizedRelay = relay.trim();
    if (!normalizedRelay || relays.includes(normalizedRelay)) {
      return false;
    }
    
    // Basic validation for websocket URLs
    if (!normalizedRelay.startsWith('wss://') && !normalizedRelay.startsWith('ws://')) {
      return false;
    }
    
    setRelays(prev => [...prev, normalizedRelay]);
    return true;
  }, [relays]);

  const removeRelay = useCallback((relay: string) => {
    setRelays(prev => prev.filter(r => r !== relay));
  }, []);

  const resetToDefaults = useCallback(() => {
    setRelays(DEFAULT_RELAYS);
  }, []);

  return {
    relays,
    addRelay,
    removeRelay,
    resetToDefaults
  };
}