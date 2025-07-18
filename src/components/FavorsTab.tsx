import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, Gift, HandHeart, Clock, MapPin, DollarSign, Plus } from 'lucide-react';

interface Favor {
  id: string;
  title: string;
  description: string;
  category: 'request' | 'offer';
  location?: string;
  reward?: string;
  author: string;
  timestamp: number;
  likes: number;
  isLiked: boolean;
}

const mockFavors: Favor[] = [
  {
    id: '1',
    title: 'Help moving furniture',
    description: 'Need help moving a couch and dining table to my new apartment. Will provide pizza and drinks!',
    category: 'request',
    location: 'Downtown',
    reward: 'Pizza & drinks',
    author: 'npub1abc123...',
    timestamp: Date.now() - 3600000,
    likes: 5,
    isLiked: false,
  },
  {
    id: '2',
    title: 'Free coding lessons',
    description: 'Offering free Python programming lessons for beginners. I\'m a senior developer with 8+ years experience.',
    category: 'offer',
    location: 'Online',
    reward: 'Free',
    author: 'npub1def456...',
    timestamp: Date.now() - 7200000,
    likes: 12,
    isLiked: true,
  },
  {
    id: '3',
    title: 'Dog walking service',
    description: 'Going out of town for the weekend. Need someone to walk my golden retriever twice a day.',
    category: 'request',
    location: 'Park Avenue',
    reward: '50 sats/walk',
    author: 'npub1ghi789...',
    timestamp: Date.now() - 10800000,
    likes: 3,
    isLiked: false,
  },
];

export default function FavorsTab() {
  const [favors, setFavors] = useState<Favor[]>(mockFavors);
  const [isCreating, setIsCreating] = useState(false);
  const [newFavor, setNewFavor] = useState({
    title: '',
    description: '',
    category: 'request' as 'request' | 'offer',
    location: '',
    reward: ''
  });

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const handleLike = (favorId: string) => {
    setFavors(prev => prev.map(favor => 
      favor.id === favorId 
        ? { 
            ...favor, 
            likes: favor.isLiked ? favor.likes - 1 : favor.likes + 1,
            isLiked: !favor.isLiked 
          }
        : favor
    ));
  };

  const createFavor = () => {
    if (!newFavor.title.trim() || !newFavor.description.trim()) return;

    const favor: Favor = {
      id: Date.now().toString(),
      ...newFavor,
      author: 'You',
      timestamp: Date.now(),
      likes: 0,
      isLiked: false,
    };

    setFavors(prev => [favor, ...prev]);
    setNewFavor({
      title: '',
      description: '',
      category: 'request',
      location: '',
      reward: ''
    });
    setIsCreating(false);
  };

  if (isCreating) {
    return (
      <div className="space-y-4 pb-20">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Create a Favor</h2>
          <Button 
            variant="outline" 
            onClick={() => setIsCreating(false)}
          >
            Cancel
          </Button>
        </div>

        <Card className="shadow-elegant">
          <CardContent className="p-4 space-y-4">
            <div className="flex gap-2">
              <Button
                variant={newFavor.category === 'request' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewFavor(prev => ({ ...prev, category: 'request' }))}
                className={newFavor.category === 'request' ? 'bg-gradient-primary' : ''}
              >
                <HandHeart className="h-4 w-4 mr-2" />
                Request Help
              </Button>
              <Button
                variant={newFavor.category === 'offer' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setNewFavor(prev => ({ ...prev, category: 'offer' }))}
                className={newFavor.category === 'offer' ? 'bg-gradient-primary' : ''}
              >
                <Gift className="h-4 w-4 mr-2" />
                Offer Help
              </Button>
            </div>

            <Input
              placeholder="What do you need help with?"
              value={newFavor.title}
              onChange={(e) => setNewFavor(prev => ({ ...prev, title: e.target.value }))}
            />

            <Textarea
              placeholder="Provide more details..."
              value={newFavor.description}
              onChange={(e) => setNewFavor(prev => ({ ...prev, description: e.target.value }))}
              className="min-h-[100px]"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Location (optional)"
                value={newFavor.location}
                onChange={(e) => setNewFavor(prev => ({ ...prev, location: e.target.value }))}
              />
              <Input
                placeholder="Reward/Payment (optional)"
                value={newFavor.reward}
                onChange={(e) => setNewFavor(prev => ({ ...prev, reward: e.target.value }))}
              />
            </div>

            <Button 
              onClick={createFavor}
              disabled={!newFavor.title.trim() || !newFavor.description.trim()}
              className="w-full bg-gradient-primary hover:opacity-90"
            >
              Post Favor
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Community Favors</h2>
          <p className="text-sm text-muted-foreground">Help and be helped by your Nostr community</p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="bg-gradient-primary hover:opacity-90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create
        </Button>
      </div>

      <div className="space-y-4">
        {favors.map((favor) => (
          <Card key={favor.id} className="shadow-elegant hover:shadow-glow transition-shadow duration-300">
            <CardContent className="p-4">
              <div className="flex space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                    {favor.author.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      variant={favor.category === 'request' ? 'secondary' : 'default'}
                      className={favor.category === 'offer' ? 'bg-gradient-primary text-white' : ''}
                    >
                      {favor.category === 'request' ? (
                        <HandHeart className="h-3 w-3 mr-1" />
                      ) : (
                        <Gift className="h-3 w-3 mr-1" />
                      )}
                      {favor.category === 'request' ? 'Request' : 'Offer'}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatTime(favor.timestamp)}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-foreground mb-2">{favor.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{favor.description}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                    {favor.location && (
                      <span className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        {favor.location}
                      </span>
                    )}
                    {favor.reward && (
                      <span className="flex items-center">
                        <DollarSign className="h-3 w-3 mr-1" />
                        {favor.reward}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => handleLike(favor.id)}
                      className={`flex items-center space-x-1 transition-colors ${
                        favor.isLiked ? 'text-red-500' : 'text-muted-foreground hover:text-red-500'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${favor.isLiked ? 'fill-current' : ''}`} />
                      <span className="text-xs">{favor.likes}</span>
                    </button>
                    
                    <Button size="sm" variant="outline">
                      {favor.category === 'request' ? 'Help Out' : 'Learn More'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}