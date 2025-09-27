import { useState } from 'react';
import { Event } from 'nostr-tools';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { useToast } from '../hooks/use-toast';
import { 
  createChannelCreateEvent,
  createFavorUpdateEvent, 
  createPreapprovalEvent,
  convertToNostrEvent,
  EXAMPLE_UNSIGNED_EVENTS,
  type FavorChannelEvent
} from '../utils/favorCoreEvents';
import { FAVOR_EVENT_KINDS } from '../types/favorEvents';

interface FavorEventsDemoProps {
  nostrSigning: {
    isConnected: boolean;
    userPublicKey: string | null;
    signEvent: (unsignedEvent: Partial<Event>) => Promise<Event>;
  };
}

export function FavorEventsDemo({ nostrSigning }: FavorEventsDemoProps) {
  const [lastSignedEvent, setLastSignedEvent] = useState<Event | null>(null);
  const [currentUnsignedEvent, setCurrentUnsignedEvent] = useState<FavorChannelEvent | null>(null);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const { toast } = useToast();

  const handleCreateChannelDemo = async () => {
    if (!nostrSigning.isConnected || !nostrSigning.userPublicKey) {
      toast({
        title: "Connection Required",
        description: "Please connect to a NIP-46 signer first",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingEvent(true);
    try {
      // Step 1: Create unsigned favor event JSON
      const unsignedEvent = createChannelCreateEvent(
        [
          nostrSigning.userPublicKey,
          "npub1bob123456789..." // Demo participant
        ],
        "Demo Favor Channel",
        { description: "Testing channel creation via NIP-46" }
      );

      console.log('🔄 Step 1 - Unsigned Favor Event:', JSON.stringify(unsignedEvent, null, 2));
      setCurrentUnsignedEvent(unsignedEvent);

      // Step 2: Convert to Nostr event for NIP-46
      const nostrEvent = convertToNostrEvent(unsignedEvent, nostrSigning.userPublicKey);
      console.log('🔄 Step 2 - Nostr Event for NIP-46:', JSON.stringify(nostrEvent, null, 2));

      // Step 3: Sign via NIP-46 (should trigger Amber prompt)
      const signedEvent = await nostrSigning.signEvent(nostrEvent);
      console.log('✅ Step 3 - Signed Event:', JSON.stringify(signedEvent, null, 2));

      setLastSignedEvent(signedEvent);
      toast({
        title: "Channel Created",
        description: "Favor channel event signed successfully via NIP-46",
      });

    } catch (error) {
      console.error('❌ Channel creation failed:', error);
      toast({
        title: "Channel Creation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleUpdateFavorDemo = async () => {
    if (!nostrSigning.isConnected || !nostrSigning.userPublicKey) {
      toast({
        title: "Connection Required", 
        description: "Please connect to a NIP-46 signer first",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingEvent(true);
    try {
      // Step 1: Create unsigned favor update event
      const unsignedEvent = createFavorUpdateEvent(
        "demo123456789012345678901234567890123456789012345678901234567890", // Demo channel ID
        1,
        nostrSigning.userPublicKey,
        "npub1bob123456789...", // Demo recipient
        3,
        "Help with moving boxes",
        "debt"
      );

      console.log('🔄 Step 1 - Unsigned Favor Event:', JSON.stringify(unsignedEvent, null, 2));
      setCurrentUnsignedEvent(unsignedEvent);

      // Step 2: Convert to Nostr event for NIP-46
      const nostrEvent = convertToNostrEvent(unsignedEvent, nostrSigning.userPublicKey);
      console.log('🔄 Step 2 - Nostr Event for NIP-46:', JSON.stringify(nostrEvent, null, 2));

      // Step 3: Sign via NIP-46
      const signedEvent = await nostrSigning.signEvent(nostrEvent);
      console.log('✅ Step 3 - Signed Event:', JSON.stringify(signedEvent, null, 2));

      setLastSignedEvent(signedEvent);
      toast({
        title: "Favor Updated",
        description: "Favor update event signed successfully via NIP-46",
      });

    } catch (error) {
      console.error('❌ Favor update failed:', error);
      toast({
        title: "Favor Update Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleSetPreapprovalDemo = async () => {
    if (!nostrSigning.isConnected || !nostrSigning.userPublicKey) {
      toast({
        title: "Connection Required",
        description: "Please connect to a NIP-46 signer first", 
        variant: "destructive",
      });
      return;
    }

    setIsCreatingEvent(true);
    try {
      // Step 1: Create unsigned preapproval event
      const unsignedEvent = createPreapprovalEvent(
        "demo123456789012345678901234567890123456789012345678901234567890", // Demo channel ID
        2,
        nostrSigning.userPublicKey,
        5,
        Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days from now
        ["Small tasks only", "Maximum 2 hours work"],
        true
      );

      console.log('🔄 Step 1 - Unsigned Favor Event:', JSON.stringify(unsignedEvent, null, 2));
      setCurrentUnsignedEvent(unsignedEvent);

      // Step 2: Convert to Nostr event for NIP-46
      const nostrEvent = convertToNostrEvent(unsignedEvent, nostrSigning.userPublicKey);
      console.log('🔄 Step 2 - Nostr Event for NIP-46:', JSON.stringify(nostrEvent, null, 2));

      // Step 3: Sign via NIP-46
      const signedEvent = await nostrSigning.signEvent(nostrEvent);
      console.log('✅ Step 3 - Signed Event:', JSON.stringify(signedEvent, null, 2));

      setLastSignedEvent(signedEvent);
      toast({
        title: "Preapproval Set",
        description: "Preapproval event signed successfully via NIP-46",
      });

    } catch (error) {
      console.error('❌ Preapproval failed:', error);
      toast({
        title: "Preapproval Failed", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsCreatingEvent(false);
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
          <CardTitle>Favor Channels Event Demo</CardTitle>
          <CardDescription>
            Test the core favor event structure with NIP-46 remote signing flow
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleCreateChannelDemo} 
              disabled={isCreatingEvent || !nostrSigning.isConnected}
              variant="outline"
            >
              Create Channel Event
            </Button>
            <Button 
              onClick={handleUpdateFavorDemo} 
              disabled={isCreatingEvent || !nostrSigning.isConnected}
              variant="outline"
            >
              Update Favor Event
            </Button>
            <Button 
              onClick={handleSetPreapprovalDemo} 
              disabled={isCreatingEvent || !nostrSigning.isConnected}
              variant="outline"
            >
              Set Preapproval Event
            </Button>
          </div>
          
          {!nostrSigning.isConnected && (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              ⚠️ Please connect to a NIP-46 signer (like Amber) to test signing events
            </div>
          )}

          {currentUnsignedEvent && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <h4 className="font-semibold">Current Unsigned Event JSON</h4>
                  <Badge variant="secondary">{getEventKindName(currentUnsignedEvent.kind)}</Badge>
                  <Badge variant="outline">Kind {currentUnsignedEvent.kind}</Badge>
                </div>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                  {JSON.stringify(currentUnsignedEvent, null, 2)}
                </pre>
                <p className="text-xs text-muted-foreground mt-2">
                  ↑ This is the core favor event structure that gets signed via NIP-46
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Last Signed Event Result */}
      {lastSignedEvent && (
        <Card>
          <CardHeader>
            <CardTitle>✅ Last Signed Event Result</CardTitle>
            <CardDescription>
              Signed Nostr event returned from NIP-46 signer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-green-50 text-green-900 p-4 rounded-lg text-sm overflow-x-auto">
              {JSON.stringify(lastSignedEvent, null, 2)}
            </pre>
            <p className="text-xs text-muted-foreground mt-2">
              ↑ Signed Nostr event returned from NIP-46 signer
            </p>
          </CardContent>
        </Card>
      )}

      {/* Example Unsigned Event Payloads */}
      <Card>
        <CardHeader>
          <CardTitle>Example Unsigned Event Payloads</CardTitle>
          <CardDescription>
            Core event structures ready for NIP-46 signing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(EXAMPLE_UNSIGNED_EVENTS).map(([eventType, eventInfo]) => (
            <div key={eventType} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  Kind {eventInfo.example.kind}
                </Badge>
                <h4 className="font-medium">{eventInfo.description}</h4>
              </div>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                {JSON.stringify(eventInfo.example, null, 2)}
              </pre>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Event Kinds Reference */}
      <Card>
        <CardHeader>
          <CardTitle>Event Kinds Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {Object.entries(FAVOR_EVENT_KINDS).map(([name, kind]) => (
              <div key={name} className="flex justify-between items-center">
                <span className="font-mono text-sm">{name}</span>
                <Badge variant="outline">Kind {String(kind)}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Implementation Requirements */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h5 className="font-medium">Core Event Structure:</h5>
            <pre className="bg-muted p-4 rounded-lg text-sm">
{`{
  "kind": <int>,
  "channel_id": <string>, 
  "state_version": <int>,
  "payload": { ... },
  "signatures": [ { "pubkey": <hex>, "sig": <hex> } ]
}`}
            </pre>
          </div>
          
          <div className="space-y-2">
            <h5 className="font-medium">Channel ID Derivation:</h5>
            <code className="text-sm bg-muted px-2 py-1 rounded">
              sha256(sorted(pubkeys) || creation_time)
            </code>
          </div>

          <div className="space-y-2">
            <h5 className="font-medium">NIP-46 Remote Signing Flow:</h5>
            <ol className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>1. Generate unsigned event JSON with core structure</li>
              <li>2. Output the unsigned JSON for verification</li>
              <li>3. Convert to Nostr event format for NIP-46</li>
              <li>4. Send sign_event request to remote signer</li>
              <li>5. Remote signer (Amber) prompts user for approval</li>
              <li>6. Collect signed event response</li>
              <li>7. Extract signature for favor event signatures array</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}