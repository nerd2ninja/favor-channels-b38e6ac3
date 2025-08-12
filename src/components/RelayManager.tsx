import { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useRelays } from '@/hooks/useRelays';
import { Plus, X, RotateCcw, Globe } from 'lucide-react';

export default function RelayManager() {
  const { relays, addRelay, removeRelay, resetToDefaults } = useRelays();
  const [newRelay, setNewRelay] = useState('');
  const { toast } = useToast();

  const handleAddRelay = () => {
    if (!newRelay.trim()) {
      toast({
        title: "Invalid Relay",
        description: "Please enter a relay URL",
        variant: "destructive",
      });
      return;
    }

    if (addRelay(newRelay)) {
      setNewRelay('');
      toast({
        title: "Relay Added",
        description: `Added ${newRelay} to your relay list`,
      });
    } else {
      toast({
        title: "Failed to Add Relay",
        description: "Relay already exists or invalid URL format. Use wss:// or ws://",
        variant: "destructive",
      });
    }
  };

  const handleRemoveRelay = (relay: string) => {
    removeRelay(relay);
    toast({
      title: "Relay Removed",
      description: `Removed ${relay} from your relay list`,
    });
  };

  const handleResetDefaults = () => {
    resetToDefaults();
    toast({
      title: "Relays Reset",
      description: "Reset to default relay configuration",
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddRelay();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            <CardTitle>Relay Management</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleResetDefaults}
            className="text-xs"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset Defaults
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new relay */}
        <div className="flex gap-2">
          <Input
            placeholder="wss://relay.example.com"
            value={newRelay}
            onChange={(e) => setNewRelay(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleAddRelay} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Current relays */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Current Relays ({relays.length})
          </h4>
          {relays.length === 0 ? (
            <p className="text-sm text-muted-foreground">No relays configured</p>
          ) : (
            <div className="space-y-2">
              {relays.map((relay, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                  <span className="text-sm font-mono break-all flex-1">{relay}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRelay(relay)}
                    className="ml-2 text-destructive hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground">
          <p>
            Relays are used to fetch your profile and publish updates. 
            More relays can improve reliability but may slow down operations.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}