import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface NostrDebugPanelProps {
  isVisible: boolean;
  onClose: () => void;
  relayConnections: Array<{
    url: string;
    status: string;
    connected: boolean;
  }>;
  nostrConnectEvents: Array<{
    timestamp: string;
    type: string;
    data: any;
  }>;
  connectionState: {
    isConnected: boolean;
    publicKey?: string;
    secret?: string;
    lastActivity?: string;
  };
}

export const NostrDebugPanel = ({
  isVisible,
  onClose,
  relayConnections,
  nostrConnectEvents,
  connectionState
}: NostrDebugPanelProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>NOSTR Connect Debug Panel</CardTitle>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Connection State */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Connection State</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge variant={connectionState.isConnected ? "default" : "secondary"}>
                    {connectionState.isConnected ? "Connected" : "Waiting"}
                  </Badge>
                </div>
                {connectionState.publicKey && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Public Key:</span>
                    <code className="text-xs bg-muted p-2 rounded block">
                      {connectionState.publicKey}
                    </code>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {connectionState.secret && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Secret:</span>
                    <code className="text-xs bg-muted p-2 rounded block">
                      {connectionState.secret}
                    </code>
                  </div>
                )}
                {connectionState.lastActivity && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Last Activity:</span>
                    <span className="text-sm">{connectionState.lastActivity}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Relay Connections */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Relay Connections</h3>
            <div className="space-y-2">
              {relayConnections.map((relay, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <code className="text-sm">{relay.url}</code>
                  <div className="flex items-center gap-2">
                    <Badge variant={relay.connected ? "default" : "destructive"}>
                      {relay.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* NOSTR Connect Events */}
          <div>
            <h3 className="text-lg font-semibold mb-2">NOSTR Connect Events</h3>
            <ScrollArea className="h-64 border rounded">
              <div className="p-4 space-y-3">
                {nostrConnectEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events received yet</p>
                ) : (
                  nostrConnectEvents.map((event, index) => (
                    <div key={index} className="border-l-2 border-primary pl-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{event.type}</Badge>
                        <span className="text-xs text-muted-foreground">{event.timestamp}</span>
                      </div>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};