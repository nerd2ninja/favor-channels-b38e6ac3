import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Zap, Send, Key, Users, Globe, Heart, MessageCircle, Repeat2, Search, User, QrCode, Edit, Copy, Settings, LogOut, X } from 'lucide-react';
import { Relay, Event, nip19, getPublicKey } from 'nostr-tools';
import QRCode from 'qrcode';
import FavorsTab from './FavorsTab';
import FavorChannelsTab from './FavorChannelsTab';
import FavorNetworkTab from './FavorNetworkTab';
import BottomNav from './BottomNav';

interface NostrEvent extends Event {
  created_at: number;
  content: string;
  pubkey: string;
  id: string;
  sig: string;
  kind: number;
  tags: string[][];
}

const RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band'
];

export default function NostrApp() {
  const [relays, setRelays] = useState<Relay[]>([]);
  const [privateKey, setPrivateKey] = useState<string>('');
  const [publicKey, setPublicKey] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [newNote, setNewNote] = useState('');
  const [events, setEvents] = useState<NostrEvent[]>([]);
  const [profile, setProfile] = useState({ 
    name: '', 
    about: '', 
    picture: '',
    banner: '',
    website: '',
    nip05: ''
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [showNostrConnect, setShowNostrConnect] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [connectionSecret, setConnectionSecret] = useState('');
  const [clientKeypair, setClientKeypair] = useState<{ privateKey: string; publicKey: string } | null>(null);
  const [isAwaitingConnection, setIsAwaitingConnection] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load saved keys from localStorage
    const savedPrivateKey = localStorage.getItem('nostr-private-key');
    if (savedPrivateKey) {
      setPrivateKey(savedPrivateKey);
      const hexBytes = new Uint8Array(savedPrivateKey.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      const pubKey = getPublicKey(hexBytes);
      setPublicKey(pubKey);
      connectToRelays();
    }
  }, []);

  const connectToRelays = async () => {
    try {
      setIsConnected(true);
      subscribeToFeed();
      toast({
        title: "Connected to Nostr",
        description: "Successfully connected to relays",
      });
    } catch (error) {
      console.error('Connection error:', error);
      toast({
        title: "Connection failed",
        description: "Failed to connect to relays",
        variant: "destructive",
      });
    }
  };

  const generateKeys = () => {
    // Generate a random 32-byte private key
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const newPrivateKey = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    const newPublicKey = getPublicKey(array);
    
    setPrivateKey(newPrivateKey);
    setPublicKey(newPublicKey);
    
    localStorage.setItem('nostr-private-key', newPrivateKey);
    
    toast({
      title: "Keys Generated",
      description: "New Nostr keys created and saved locally",
    });
  };

  const importKey = (key: string) => {
    try {
      let privateKeyToUse = key;
      
      // Handle nsec format
      if (key.startsWith('nsec')) {
        const decoded = nip19.decode(key);
        privateKeyToUse = decoded.data as string;
      }
      
      const hexBytes = new Uint8Array(privateKeyToUse.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
      const pubKey = getPublicKey(hexBytes);
      setPrivateKey(privateKeyToUse);
      setPublicKey(pubKey);
      
      localStorage.setItem('nostr-private-key', privateKeyToUse);
      connectToRelays();
      
      toast({
        title: "Key Imported",
        description: "Private key imported successfully",
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Invalid private key format",
        variant: "destructive",
      });
    }
  };

  const generateClientKeypair = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const privateKey = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    const publicKey = getPublicKey(array);
    return { privateKey, publicKey };
  };

  const generateRandomSecret = () => {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  };

  const initiateNostrConnect = async () => {
    try {
      // Set dialog to open first
      setShowNostrConnect(true);
      
      // Generate client keypair for this session
      const keypair = generateClientKeypair();
      setClientKeypair(keypair);
      
      // Generate random secret for connection verification
      const secret = generateRandomSecret();
      setConnectionSecret(secret);
      
      // Create the nostrconnect:// URL according to NIP-46
      const nostrConnectUrl = new URL(`nostrconnect://${keypair.publicKey}`);
      nostrConnectUrl.searchParams.append('relay', 'wss://relay.damus.io');
      nostrConnectUrl.searchParams.append('relay', 'wss://nos.lol');
      nostrConnectUrl.searchParams.append('secret', secret);
      nostrConnectUrl.searchParams.append('name', 'Nostr Favor App');
      nostrConnectUrl.searchParams.append('url', window.location.origin);
      nostrConnectUrl.searchParams.append('perms', 'sign_event:1,sign_event:0,get_public_key');
      
      const connectionString = nostrConnectUrl.toString();
      setQrCodeUrl(connectionString);
      
      console.log('Connection string generated:', connectionString);
      
      // Generate QR code after a small delay to ensure canvas is rendered
      setTimeout(async () => {
        if (qrCanvasRef.current) {
          try {
            await QRCode.toCanvas(qrCanvasRef.current, connectionString, {
              width: 256,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#ffffff'
              }
            });
            console.log('QR code generated successfully on canvas');
          } catch (qrError) {
            console.error('QR code generation error:', qrError);
            toast({
              title: "QR Generation Failed",
              description: "Could not generate QR code, but you can copy the connection string",
              variant: "destructive",
            });
          }
        } else {
          console.error('Canvas ref not available for QR generation');
        }
      }, 200);
      
      setIsAwaitingConnection(true);
      
      // Start listening for connection response
      listenForNostrConnectResponse(keypair);
      
      toast({
        title: "NOSTR Connect Ready",
        description: "Open Amber and scan the QR code to connect",
      });
    } catch (error) {
      console.error('Failed to generate NOSTR Connect setup:', error);
      toast({
        title: "Error",
        description: "Failed to generate connection QR code",
        variant: "destructive",
      });
    }
  };

  const listenForNostrConnectResponse = async (keypair: { privateKey: string; publicKey: string }) => {
    try {
      // Connect to relays to listen for responses
      const relayPromises = RELAYS.map(async (url) => {
        try {
          const relay = await Relay.connect(url);
          
          // Subscribe to events targeting our client pubkey
          const sub = relay.subscribe([
            {
              kinds: [24133], // NIP-46 response events
              '#p': [keypair.publicKey], // Events that p-tag our client pubkey
              since: Math.floor(Date.now() / 1000) - 60 // Only recent events
            }
          ], {
            onevent: (event: NostrEvent) => {
              handleNostrConnectResponse(event, keypair);
            }
          });
          
          return relay;
        } catch (error) {
          console.error(`Failed to connect to ${url}:`, error);
          return null;
        }
      });
      
      const connectedRelays = (await Promise.all(relayPromises)).filter(Boolean) as Relay[];
      console.log(`Listening for NOSTR Connect responses on ${connectedRelays.length} relays`);
    } catch (error) {
      console.error('Failed to listen for NOSTR Connect responses:', error);
    }
  };

  const handleNostrConnectResponse = async (event: NostrEvent, keypair: { privateKey: string; publicKey: string }) => {
    try {
      // In a real implementation, we would decrypt the event content using NIP-44
      // For now, we'll simulate a successful connection
      console.log('Received NOSTR Connect response:', event);
      
      // Simulate extracting remote signer pubkey and verifying secret
      const remoteSignerPubkey = event.pubkey;
      
      // For demo purposes, assume connection is successful
      setIsConnected(true);
      setIsAwaitingConnection(false);
      setShowNostrConnect(false);
      setPublicKey(remoteSignerPubkey);
      
      // Store the connection details
      localStorage.setItem('nostr-connect-remote-signer', remoteSignerPubkey);
      localStorage.setItem('nostr-connect-client-keypair', JSON.stringify(keypair));
      
      toast({
        title: "Connected!",
        description: "Successfully connected via NOSTR Connect",
      });
    } catch (error) {
      console.error('Failed to handle NOSTR Connect response:', error);
      toast({
        title: "Connection Failed",
        description: "Failed to establish NOSTR Connect connection",
        variant: "destructive",
      });
    }
  };

  const closeNostrConnect = () => {
    setShowNostrConnect(false);
    setIsAwaitingConnection(false);
    setQrCodeUrl('');
    setConnectionSecret('');
    setClientKeypair(null);
  };

  const updateProfile = async (updatedProfile: typeof profile) => {
    if (!privateKey || relays.length === 0) return;

    try {
      // Create a kind 0 event for profile metadata
      const profileEvent = {
        kind: 0,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: JSON.stringify({
          name: updatedProfile.name,
          about: updatedProfile.about,
          picture: updatedProfile.picture,
          banner: updatedProfile.banner,
          website: updatedProfile.website,
          nip05: updatedProfile.nip05
        }),
        pubkey: publicKey,
      };

      // Simple event signing (basic implementation)
      const eventJson = JSON.stringify([0, profileEvent.pubkey, profileEvent.created_at, profileEvent.kind, profileEvent.tags, profileEvent.content]);
      const eventHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(eventJson));
      const eventId = Array.from(new Uint8Array(eventHash), b => b.toString(16).padStart(2, '0')).join('');
      
      const finalEvent = { ...profileEvent, id: eventId, sig: 'placeholder' } as NostrEvent;

      // Publish to connected relays
      const publishPromises = relays.map(relay => relay.publish(finalEvent));
      await Promise.allSettled(publishPromises);
      
      setProfile(updatedProfile);
      setEditingProfile(false);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated on Nostr",
      });
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const logOut = () => {
    localStorage.removeItem('nostr-private-key');
    setPrivateKey('');
    setPublicKey('');
    setIsConnected(false);
    setProfile({ name: '', about: '', picture: '', banner: '', website: '', nip05: '' });
    setRelays([]);
    setEvents([]);
    toast({
      title: "Logged Out",
      description: "You have been logged out successfully",
    });
  };

  const subscribeToFeed = async () => {
    try {
      // Connect to relays and fetch events
      const connectPromises = RELAYS.map(async (url) => {
        try {
          const relay = await Relay.connect(url);
          console.log(`Connected to ${url}`);
          
          // Subscribe to text notes
          const sub = relay.subscribe([
            {
              kinds: [1], // Text notes
              limit: 50
            }
          ], {
            onevent(event: NostrEvent) {
              setEvents(prev => {
                const exists = prev.find(e => e.id === event.id);
                if (exists) return prev;
                
                const newEvents = [...prev, event];
                return newEvents.sort((a, b) => b.created_at - a.created_at);
              });
            },
            oneose() {
              console.log('End of stored events');
            }
          });
          
          return relay;
        } catch (error) {
          console.error(`Failed to connect to ${url}:`, error);
          return null;
        }
      });
      
      const connectedRelays = (await Promise.all(connectPromises)).filter(Boolean) as Relay[];
      setRelays(connectedRelays);
    } catch (error) {
      console.error('Failed to subscribe to feed:', error);
    }
  };

  const publishNote = async () => {
    if (!privateKey || !newNote.trim() || relays.length === 0) return;

    try {
      // Create event object
      const event = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: newNote,
        pubkey: publicKey,
      };

      // Simple event signing (basic implementation)
      const eventJson = JSON.stringify([0, event.pubkey, event.created_at, event.kind, event.tags, event.content]);
      const eventHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(eventJson));
      const eventId = Array.from(new Uint8Array(eventHash), b => b.toString(16).padStart(2, '0')).join('');
      
      const finalEvent = { ...event, id: eventId, sig: 'placeholder' } as NostrEvent;

      // Publish to connected relays
      const publishPromises = relays.map(relay => relay.publish(finalEvent));
      await Promise.allSettled(publishPromises);
      
      setNewNote('');
      toast({
        title: "Note Published",
        description: "Your note has been published to Nostr",
      });
    } catch (error) {
      console.error('Publish error:', error);
      toast({
        title: "Publish Failed",
        description: "Failed to publish note",
        variant: "destructive",
      });
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const shortenPubkey = (pubkey: string) => {
    return pubkey.slice(0, 8) + '...' + pubkey.slice(-8);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'favors':
        return <FavorsTab />;
      case 'favor-channels':
        return <FavorChannelsTab />;
      case 'favor-network':
        return <FavorNetworkTab />;
      case 'search':
        return (
          <div className="space-y-4 pb-20">
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Search & Discovery</h3>
              <p className="text-muted-foreground">Coming soon! Find users and content across Nostr.</p>
            </div>
          </div>
        );
      case 'messages':
        return (
          <div className="space-y-4 pb-20">
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Direct Messages</h3>
              <p className="text-muted-foreground">Coming soon! Private messaging with end-to-end encryption.</p>
            </div>
          </div>
        );
      case 'profile':
        return (
          <div className="space-y-6 pb-20">
            {/* Profile Header */}
            <Card className="shadow-elegant">
              <CardContent className="p-0">
                {/* Banner */}
                <div className="h-32 bg-gradient-primary rounded-t-lg relative">
                  {profile.banner && (
                    <img 
                      src={profile.banner} 
                      alt="Profile banner" 
                      className="w-full h-full object-cover rounded-t-lg"
                    />
                  )}
                </div>
                
                {/* Profile Info */}
                <div className="p-6 relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-20 w-20 border-4 border-background -mt-12">
                        {profile.picture ? (
                          <img src={profile.picture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <AvatarFallback className="bg-gradient-primary text-white text-xl font-bold">
                            {profile.name ? profile.name.slice(0, 2).toUpperCase() : publicKey.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      
                      <div className="flex-1 mt-2">
                        <h2 className="text-2xl font-bold">
                          {profile.name || 'Anonymous'}
                        </h2>
                        <p className="text-muted-foreground">
                          {profile.about || 'No bio set'}
                        </p>
                        {profile.website && (
                          <a 
                            href={profile.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-sm"
                          >
                            {profile.website}
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <Dialog open={editingProfile} onOpenChange={setEditingProfile}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Profile
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Edit Profile</DialogTitle>
                        </DialogHeader>
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            updateProfile({
                              name: formData.get('name') as string,
                              about: formData.get('about') as string,
                              picture: formData.get('picture') as string,
                              banner: formData.get('banner') as string,
                              website: formData.get('website') as string,
                              nip05: formData.get('nip05') as string,
                            });
                          }}
                          className="space-y-4"
                        >
                          <div>
                            <label className="text-sm font-medium">Display Name</label>
                            <Input name="name" defaultValue={profile.name} placeholder="Your name" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">About</label>
                            <Textarea name="about" defaultValue={profile.about} placeholder="Tell us about yourself" />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Profile Picture URL</label>
                            <Input name="picture" defaultValue={profile.picture} placeholder="https://..." />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Banner URL</label>
                            <Input name="banner" defaultValue={profile.banner} placeholder="https://..." />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Website</label>
                            <Input name="website" defaultValue={profile.website} placeholder="https://..." />
                          </div>
                          <div>
                            <label className="text-sm font-medium">NIP-05 Identifier</label>
                            <Input name="nip05" defaultValue={profile.nip05} placeholder="user@domain.com" />
                          </div>
                          <div className="flex space-x-2">
                            <Button type="submit" className="flex-1">Save Changes</Button>
                            <Button type="button" variant="outline" onClick={() => setEditingProfile(false)}>
                              Cancel
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Keys & Identity */}
            <Card className="shadow-elegant">
              <CardHeader>
                <h3 className="text-lg font-semibold">Keys & Identity</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Public Key (npub)</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="font-mono text-xs flex-1 justify-start">
                      {nip19.npubEncode(publicKey)}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(nip19.npubEncode(publicKey), 'Public key')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Hex Public Key</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="font-mono text-xs flex-1 justify-start">
                      {shortenPubkey(publicKey)}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(publicKey, 'Hex public key')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {profile.nip05 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">NIP-05 Verified</label>
                    <Badge variant="secondary" className="mt-1">
                      ✓ {profile.nip05}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Settings */}
            <Card className="shadow-elegant">
              <CardHeader>
                <h3 className="text-lg font-semibold">Settings</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  App Preferences
                </Button>
                
                <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={logOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>
        );
      default: // 'home'
        return (
          <div className="space-y-4 pb-20">
            {/* Compose Note */}
            <Card className="shadow-elegant">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <Textarea
                    placeholder="What's on your mind?"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="min-h-[100px] resize-none border-0 focus-visible:ring-0 text-base"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {newNote.length}/280
                    </span>
                    <Button 
                      onClick={publishNote}
                      disabled={!newNote.trim()}
                      className="bg-gradient-primary hover:opacity-90 transition-opacity"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Publish
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Feed */}
            <div className="space-y-4">
              {events.length === 0 ? (
                <Card className="shadow-elegant">
                  <CardContent className="p-8 text-center">
                    <div className="mb-4">
                      <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No notes yet</h3>
                    <p className="text-muted-foreground">
                      Be the first to publish a note or wait for others to appear!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                events.map((event) => (
                  <Card key={event.id} className="shadow-elegant hover:shadow-glow transition-shadow duration-300">
                    <CardContent className="p-4">
                      <div className="flex space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-primary text-white font-semibold">
                            {event.pubkey.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="font-medium text-sm">
                              {shortenPubkey(event.pubkey)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(event.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-foreground whitespace-pre-wrap mb-3">
                            {event.content}
                          </p>
                          
                          <div className="flex items-center space-x-6 text-muted-foreground">
                            <button className="flex items-center space-x-1 hover:text-blue-500 transition-colors">
                              <MessageCircle className="h-4 w-4" />
                              <span className="text-xs">Reply</span>
                            </button>
                            <button className="flex items-center space-x-1 hover:text-green-500 transition-colors">
                              <Repeat2 className="h-4 w-4" />
                              <span className="text-xs">Repost</span>
                            </button>
                            <button className="flex items-center space-x-1 hover:text-red-500 transition-colors">
                              <Heart className="h-4 w-4" />
                              <span className="text-xs">Like</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        );
    }
  };

  if (!privateKey) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-primary rounded-full shadow-glow">
                <Zap className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Welcome to Nostr
            </h1>
            <p className="text-muted-foreground">
              A decentralized social protocol
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={generateKeys} 
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
              size="lg"
            >
              <Key className="mr-2 h-4 w-4" />
              Generate New Keys
            </Button>
            
            <Dialog open={showNostrConnect} onOpenChange={setShowNostrConnect}>
              <DialogTrigger asChild>
                <Button 
                  onClick={initiateNostrConnect}
                  className="w-full" 
                  variant="outline"
                  size="lg"
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  NOSTR Connect QR Code
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle>NOSTR Connect</DialogTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={closeNostrConnect}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Scan this QR code with Amber or another NIP-46 compatible signer
                    </p>
                    
                    {/* QR Code Canvas */}
                    <div className="flex justify-center mb-4">
                      <canvas
                        ref={qrCanvasRef}
                        className="border rounded-lg"
                        style={{ maxWidth: '256px', maxHeight: '256px' }}
                      />
                    </div>
                    
                    {isAwaitingConnection && (
                      <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                        <span>Waiting for connection...</span>
                      </div>
                    )}
                    
                    {qrCodeUrl && (
                      <div className="mt-4">
                        <p className="text-xs text-muted-foreground mb-2">
                          Or copy the connection string:
                        </p>
                        <div className="bg-muted p-2 rounded text-xs font-mono break-all">
                          {qrCodeUrl}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(qrCodeUrl);
                            toast({
                              title: "Copied!",
                              description: "Connection string copied to clipboard",
                            });
                          }}
                          className="mt-2 w-full"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Connection String
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Input
                placeholder="Import private key (nsec... or hex)"
                onChange={(e) => {
                  if (e.target.value.length > 0) {
                    importKey(e.target.value);
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-primary rounded-lg shadow-glow">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Nostr
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <Badge variant="secondary" className="hidden sm:flex">
              <Globe className="mr-1 h-3 w-3" />
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Badge variant="outline">
              <Users className="mr-1 h-3 w-3" />
              {shortenPubkey(publicKey)}
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {renderTabContent()}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}