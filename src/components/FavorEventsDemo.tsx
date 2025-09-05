import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { useFavorEvents } from '../hooks/useFavorEvents';
import { EXAMPLE_UNSIGNED_EVENTS } from '../utils/favorEventUtils';
import { FAVOR_EVENT_KINDS } from '../types/favorEvents';

interface FavorEventsDemoProps {
  nostrSigning: any; // Using any for now to match existing pattern
}

export function FavorEventsDemo({ nostrSigning }: FavorEventsDemoProps) {
  const [lastSignedEvent, setLastSignedEvent] = useState<any>(null);
  const { createChannel, updateFavor, setPreapproval, isCreatingEvent } = useFavorEvents({ nostrSigning });

  const handleCreateChannelDemo = async () => {
    const participants = [
      "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      "b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1"
    ];
    
    const result = await createChannel(participants, "Demo Channel", { demo: true });
    if (result.success && result.signedEvent) {
      setLastSignedEvent(result.signedEvent);
    }
  };

  const handleUpdateFavorDemo = async () => {
    const channelId = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    
    const result = await updateFavor(
      channelId,
      1,
      "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      "b2c3d4e5f6789012345678901234567890123456789012345678901234567890a1",
      3,
      "Demo favor update - help with groceries",
      "debt"
    );
    
    if (result.success && result.signedEvent) {
      setLastSignedEvent(result.signedEvent);
    }
  };

  const handleSetPreapprovalDemo = async () => {
    const channelId = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    const expiry = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days from now
    
    const result = await setPreapproval(
      channelId,
      1,
      5,
      expiry,
      ["Small tasks only", "Under 1 hour"],
      true
    );
    
    if (result.success && result.signedEvent) {
      setLastSignedEvent(result.signedEvent);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Favor Channels Event Demo</CardTitle>
          <CardDescription>
            Test the core favor event types with NIP-46 remote signing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={handleCreateChannelDemo} 
              disabled={isCreatingEvent || !nostrSigning.isConnected}
              variant="outline"
            >
              Create Channel
            </Button>
            <Button 
              onClick={handleUpdateFavorDemo} 
              disabled={isCreatingEvent || !nostrSigning.isConnected}
              variant="outline"
            >
              Update Favor
            </Button>
            <Button 
              onClick={handleSetPreapprovalDemo} 
              disabled={isCreatingEvent || !nostrSigning.isConnected}
              variant="outline"
            >
              Set Preapproval
            </Button>
          </div>
          
          {!nostrSigning.isConnected && (
            <div className="text-sm text-muted-foreground">
              Connect to Amber or another NIP-46 signer to test event creation
            </div>
          )}
        </CardContent>
      </Card>

      {/* Example Unsigned Event Payloads */}
      <Card>
        <CardHeader>
          <CardTitle>Example Unsigned Event Payloads</CardTitle>
          <CardDescription>
            JSON schemas ready for NIP-46 signing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(EXAMPLE_UNSIGNED_EVENTS).map(([eventType, eventInfo]) => (
            <div key={eventType} className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  Kind {eventInfo.example.kind}
                </Badge>
                <h4 className="font-medium">{eventType.replace('_', ' ')}</h4>
              </div>
              <p className="text-sm text-muted-foreground">{eventInfo.description}</p>
              <div className="bg-muted p-3 rounded-lg">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(eventInfo.example, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Last Signed Event Result */}
      {lastSignedEvent && (
        <Card>
          <CardHeader>
            <CardTitle>Last Signed Event</CardTitle>
            <CardDescription>
              Result from NIP-46 remote signer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-3 rounded-lg">
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(lastSignedEvent, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}