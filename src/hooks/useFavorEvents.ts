import { useState, useCallback } from 'react';
import { Event } from 'nostr-tools';
import { useToast } from './use-toast';
import {
  createUnsignedChannelCreateEvent,
  createUnsignedFavorUpdateEvent,
  createUnsignedPreapprovalEvent,
  prepareEventForSigning,
  extractFavorEventData
} from '../utils/favorEventUtils';

interface UseFavorEventsProps {
  nostrSigning: {
    isConnected: boolean;
    userPublicKey: string | null;
    signEvent: (unsignedEvent: Partial<Event>) => Promise<Event>;
    createSignedEvent: (kind: number, content: string, tags?: string[][]) => Promise<Event>;
  };
}

export function useFavorEvents({ nostrSigning }: UseFavorEventsProps) {
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const { toast } = useToast();

  /**
   * Create and sign a channel creation event
   */
  const createChannel = useCallback(async (
    participants: string[],
    channelName?: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; signedEvent?: Event; error?: string }> => {
    if (!nostrSigning.isConnected || !nostrSigning.userPublicKey) {
      return { success: false, error: 'Not connected to Nostr signer' };
    }

    setIsCreatingEvent(true);

    try {
      // Create unsigned event
      const unsignedEvent = createUnsignedChannelCreateEvent(
        nostrSigning.userPublicKey,
        participants,
        channelName,
        metadata
      );

      console.log('Unsigned Channel Create Event:', JSON.stringify(unsignedEvent, null, 2));

      // Prepare for NIP-46 signing
      const eventForSigning = prepareEventForSigning(unsignedEvent);
      
      console.log('Event prepared for NIP-46 signing:', JSON.stringify(eventForSigning, null, 2));

      // Send to remote signer via NIP-46
      const signedEvent = await nostrSigning.signEvent(eventForSigning);
      
      console.log('Signed Channel Create Event:', JSON.stringify(signedEvent, null, 2));

      toast({
        title: "Channel Created",
        description: "Favor channel has been created and signed successfully",
      });

      return { success: true, signedEvent };

    } catch (error) {
      console.error('Failed to create channel:', error);
      toast({
        title: "Channel Creation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    } finally {
      setIsCreatingEvent(false);
    }
  }, [nostrSigning, toast]);

  /**
   * Create and sign a favor update event
   */
  const updateFavor = useCallback(async (
    channelId: string,
    stateVersion: number,
    fromPubkey: string,
    toPubkey: string,
    amount: number,
    description: string,
    favorType: 'debt' | 'credit' | 'settlement' = 'debt'
  ): Promise<{ success: boolean; signedEvent?: Event; error?: string }> => {
    if (!nostrSigning.isConnected || !nostrSigning.userPublicKey) {
      return { success: false, error: 'Not connected to Nostr signer' };
    }

    setIsCreatingEvent(true);

    try {
      // Create unsigned event
      const unsignedEvent = createUnsignedFavorUpdateEvent(
        nostrSigning.userPublicKey,
        channelId,
        stateVersion,
        fromPubkey,
        toPubkey,
        amount,
        description,
        favorType
      );

      console.log('Unsigned Favor Update Event:', JSON.stringify(unsignedEvent, null, 2));

      // Prepare for NIP-46 signing
      const eventForSigning = prepareEventForSigning(unsignedEvent);
      
      console.log('Event prepared for NIP-46 signing:', JSON.stringify(eventForSigning, null, 2));

      // Send to remote signer via NIP-46
      const signedEvent = await nostrSigning.signEvent(eventForSigning);
      
      console.log('Signed Favor Update Event:', JSON.stringify(signedEvent, null, 2));

      toast({
        title: "Favor Updated",
        description: `${favorType === 'debt' ? 'Debt' : favorType === 'credit' ? 'Credit' : 'Settlement'} recorded successfully`,
      });

      return { success: true, signedEvent };

    } catch (error) {
      console.error('Failed to update favor:', error);
      toast({
        title: "Favor Update Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    } finally {
      setIsCreatingEvent(false);
    }
  }, [nostrSigning, toast]);

  /**
   * Create and sign a preapproval event
   */
  const setPreapproval = useCallback(async (
    channelId: string,
    stateVersion: number,
    maxAmount: number,
    expiry: number,
    conditions?: string[],
    autoApprove: boolean = false
  ): Promise<{ success: boolean; signedEvent?: Event; error?: string }> => {
    if (!nostrSigning.isConnected || !nostrSigning.userPublicKey) {
      return { success: false, error: 'Not connected to Nostr signer' };
    }

    setIsCreatingEvent(true);

    try {
      // Create unsigned event
      const unsignedEvent = createUnsignedPreapprovalEvent(
        nostrSigning.userPublicKey,
        channelId,
        stateVersion,
        maxAmount,
        expiry,
        conditions,
        autoApprove
      );

      console.log('Unsigned Preapproval Event:', JSON.stringify(unsignedEvent, null, 2));

      // Prepare for NIP-46 signing
      const eventForSigning = prepareEventForSigning(unsignedEvent);
      
      console.log('Event prepared for NIP-46 signing:', JSON.stringify(eventForSigning, null, 2));

      // Send to remote signer via NIP-46
      const signedEvent = await nostrSigning.signEvent(eventForSigning);
      
      console.log('Signed Preapproval Event:', JSON.stringify(signedEvent, null, 2));

      toast({
        title: "Preapproval Set",
        description: `Auto-approval limit of ${maxAmount} favors has been set`,
      });

      return { success: true, signedEvent };

    } catch (error) {
      console.error('Failed to set preapproval:', error);
      toast({
        title: "Preapproval Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    } finally {
      setIsCreatingEvent(false);
    }
  }, [nostrSigning, toast]);

  return {
    createChannel,
    updateFavor,
    setPreapproval,
    isCreatingEvent,
    // Utility functions
    extractFavorEventData
  };
}