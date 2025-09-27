import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  createChannelCreateEvent,
  createFavorUpdateEvent, 
  createPreapprovalEvent,
  convertToNostrEvent,
  EXAMPLE_UNSIGNED_EVENTS,
  type FavorChannelEvent
} from '../utils/favorCoreEvents';
import { FAVOR_EVENT_KINDS } from '../types/favorEvents';

interface FavorEventOutputProps {
  nostrSigning: {
    isConnected: boolean;
    userPublicKey: string | null;
    signEvent: (unsignedEvent: Partial<import('nostr-tools').Event>) => Promise<import('nostr-tools').Event>;
  };
}

export function FavorEventOutput({ nostrSigning }: FavorEventOutputProps) {
  const [currentEvent, setCurrentEvent] = useState<FavorChannelEvent | null>(null);
  const [signedResult, setSignedResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreateChannelEvent = () => {
    const event = createChannelCreateEvent(
      ["npub1alice12345...", "npub1bob67890..."],
      "Demo Favor Channel",
      { description: "Testing channel creation" }
    );
    setCurrentEvent(event);
    setSignedResult(null);
    console.log('🔄 Unsigned Channel Create Event:', JSON.stringify(event, null, 2));
  };

  const handleCreateFavorEvent = () => {
    const event = createFavorUpdateEvent(
      "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      1,
      "npub1alice12345...",
      "npub1bob67890...",
      3,
      "Help with groceries",
      "debt"
    );
    setCurrentEvent(event);
    setSignedResult(null);
    console.log('🔄 Unsigned Favor Update Event:', JSON.stringify(event, null, 2));
  };

  const handleCreatePreapprovalEvent = () => {
    const event = createPreapprovalEvent(
      "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      2,
      nostrSigning.userPublicKey || "npub1alice12345...",
      10,
      Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days from now
      ["Small tasks only", "Maximum 2 hours work"],
      true
    );
    setCurrentEvent(event);
    setSignedResult(null);
    console.log('🔄 Unsigned Preapproval Event:', JSON.stringify(event, null, 2));
  };

  const handleSignWithNIP46 = async () => {
    if (!currentEvent || !nostrSigning.isConnected || !nostrSigning.userPublicKey) {
      return;
    }

    setIsProcessing(true);
    try {
      console.log('🔄 Converting to Nostr event format for NIP-46...');
      const nostrEvent = convertToNostrEvent(currentEvent, nostrSigning.userPublicKey);
      console.log('📤 Sending to NIP-46 signer:', JSON.stringify(nostrEvent, null, 2));
      
      const signedEvent = await nostrSigning.signEvent(nostrEvent);
      console.log('✅ Signed event received:', JSON.stringify(signedEvent, null, 2));
      
      setSignedResult(signedEvent);
    } catch (error) {
      console.error('❌ NIP-46 signing failed:', error);
      setSignedResult({ error: error instanceof Error ? error.message : 'Signing failed' });
    } finally {
      setIsProcessing(false);
    }
  };

  const getEventKindName = (kind: number) => {
    switch (kind) {
      case FAVOR_EVENT_KINDS.CHANNEL_CREATE: return 'Channel Create';
      case FAVOR_EVENT_KINDS.FAVOR_UPDATE: return 'Favor Update';
      case FAVOR_EVENT_KINDS.PREAPPROVAL: return 'Preapproval';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Favor Channel Events - Core Structure</CardTitle>
          <p className="text-sm text-muted-foreground">
            Generate unsigned events → Output JSON → Sign via NIP-46 → Collect signatures
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={handleCreateChannelEvent} variant="outline">
              Create Channel Event
            </Button>
            <Button onClick={handleCreateFavorEvent} variant="outline">
              Create Favor Update Event
            </Button>
            <Button onClick={handleCreatePreapprovalEvent} variant="outline">
              Create Preapproval Event
            </Button>
          </div>

          {currentEvent && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="font-semibold">Unsigned Event JSON</h4>
                  <Badge variant="secondary">{getEventKindName(currentEvent.kind)}</Badge>
                  <Badge variant="outline">Kind {currentEvent.kind}</Badge>
                </div>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {JSON.stringify(currentEvent, null, 2)}
                </pre>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Ready for NIP-46 remote signing
                </p>
                <Button 
                  onClick={handleSignWithNIP46}
                  disabled={!nostrSigning.isConnected || isProcessing}
                  className="ml-auto"
                >
                  {isProcessing ? 'Signing...' : 'Sign with NIP-46'}
                </Button>
              </div>

              {!nostrSigning.isConnected && (
                <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  ⚠️ Connect to a NIP-46 signer (like Amber) to sign events
                </div>
              )}
            </>
          )}

          {signedResult && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3">
                  {signedResult.error ? '❌ Signing Result (Error)' : '✅ Signed Event Result'}
                </h4>
                <pre className={`p-4 rounded-lg text-sm overflow-x-auto ${
                  signedResult.error ? 'bg-red-50 text-red-900' : 'bg-green-50 text-green-900'
                }`}>
                  {JSON.stringify(signedResult, null, 2)}
                </pre>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Example Event Structures</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(EXAMPLE_UNSIGNED_EVENTS).map(([key, eventData]) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="font-semibold">{eventData.description}</h4>
                <Badge variant="outline">Kind {eventData.example.kind}</Badge>
              </div>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                {JSON.stringify(eventData.example, null, 2)}
              </pre>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event Structure Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h5 className="font-medium">Required Fields:</h5>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• <code>kind</code>: Event type (30100, 30101, 30102)</li>
              <li>• <code>channel_id</code>: SHA256(sorted(pubkeys) || creation_time)</li>
              <li>• <code>state_version</code>: Incremental version number</li>
              <li>• <code>payload</code>: Event-specific data</li>
              <li>• <code>signatures</code>: Array of pubkey/signature pairs</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h5 className="font-medium">NIP-46 Flow:</h5>
            <ol className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>1. Generate unsigned event JSON</li>
              <li>2. Convert to Nostr event format</li>
              <li>3. Send sign_event request via NIP-46</li>
              <li>4. Remote signer (Amber) prompts user</li>
              <li>5. Collect signed event response</li>
              <li>6. Extract signature for favor event</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}