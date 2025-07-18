import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, User } from 'lucide-react';
import { getFavorChannels, addFavorEntry, FavorChannel } from '@/data/favorChannels';

export default function FavorChannelsTab() {
  const [channels, setChannels] = useState<FavorChannel[]>(getFavorChannels());
  const [newPersonNpub, setNewPersonNpub] = useState('');
  const [favorAmount, setFavorAmount] = useState(1);
  const [favorDirection, setFavorDirection] = useState<'owe' | 'owed'>('owe');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddFavor = () => {
    if (!newPersonNpub.trim()) return;
    
    const updatedChannels = addFavorEntry(newPersonNpub, favorAmount, favorDirection);
    setChannels(updatedChannels);
    
    // Reset form
    setNewPersonNpub('');
    setFavorAmount(1);
    setFavorDirection('owe');
    setIsDialogOpen(false);
  };

  const getBalancePercentage = (channel: FavorChannel) => {
    const total = channel.favorsOwed + channel.favorsOwedToThem;
    if (total === 0) return 50;
    return (channel.favorsOwedToThem / total) * 100;
  };

  const getBalanceColor = (channel: FavorChannel) => {
    const percentage = getBalancePercentage(channel);
    if (percentage > 60) return 'bg-green-500';
    if (percentage < 40) return 'bg-red-500';
    return 'bg-yellow-500';
  };

  const truncateNpub = (npub: string) => {
    if (npub.length <= 16) return npub;
    return `${npub.slice(0, 8)}...${npub.slice(-8)}`;
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Favor Channels</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Favor Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="npub">Person's npub</Label>
                <Input
                  id="npub"
                  value={newPersonNpub}
                  onChange={(e) => setNewPersonNpub(e.target.value)}
                  placeholder="npub1..."
                />
              </div>
              <div>
                <Label htmlFor="amount">Number of favors</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  value={favorAmount}
                  onChange={(e) => setFavorAmount(parseInt(e.target.value) || 1)}
                />
              </div>
              <div>
                <Label>Direction</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={favorDirection === 'owe' ? 'default' : 'outline'}
                    onClick={() => setFavorDirection('owe')}
                  >
                    I owe them
                  </Button>
                  <Button
                    variant={favorDirection === 'owed' ? 'default' : 'outline'}
                    onClick={() => setFavorDirection('owed')}
                  >
                    They owe me
                  </Button>
                </div>
              </div>
              <Button onClick={handleAddFavor} className="w-full">
                Add Favor Entry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {channels.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No favor channels yet</h3>
            <p className="text-muted-foreground mb-4">
              Start tracking favors by adding your first entry
            </p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Entry
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {channels.map((channel) => {
            const balancePercentage = getBalancePercentage(channel);
            const total = channel.favorsOwed + channel.favorsOwedToThem;
            
            return (
              <Card key={channel.npub}>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      <span className="font-mono text-sm">
                        {truncateNpub(channel.npub)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total: {total} favors
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">You owe: {channel.favorsOwed}</span>
                      <span className="text-green-600">They owe: {channel.favorsOwedToThem}</span>
                    </div>
                    
                    <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${getBalanceColor(channel)}`}
                        style={{ width: `${balancePercentage}%` }}
                      />
                    </div>
                    
                    <div className="text-xs text-center text-muted-foreground">
                      {channel.favorsOwedToThem > channel.favorsOwed 
                        ? `They owe you ${channel.favorsOwedToThem - channel.favorsOwed} more`
                        : channel.favorsOwed > channel.favorsOwedToThem
                        ? `You owe them ${channel.favorsOwed - channel.favorsOwedToThem} more`
                        : 'Balanced'
                      }
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      Last updated: {channel.lastUpdated.toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}