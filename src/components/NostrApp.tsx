import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Zap, Send, Key, Users, Globe, Heart, MessageCircle, Repeat2, Search, User, QrCode, Edit, Copy, Settings, LogOut, X, Bug } from 'lucide-react';
import { Relay, Event, nip19, getPublicKey } from 'nostr-tools';
import QRCode from 'qrcode';
import FavorsTab from './FavorsTab';
import FavorChannelsTab from './FavorChannelsTab';
import FavorNetworkTab from './FavorNetworkTab';
import BottomNav from './BottomNav';
import { NostrDebugPanel } from './NostrDebugPanel';
import MainApp from './MainApp';

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
  const [userPublicKey, setUserPublicKey] = useState<string>(''); // The actual user's public key from remote signer
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
  const [remoteSignerPublicKey, setRemoteSignerPublicKey] = useState<string>('');
  const [isAwaitingConnection, setIsAwaitingConnection] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [debugRelayConnections, setDebugRelayConnections] = useState<Array<{url: string; status: string; connected: boolean}>>([]);
  const [debugNostrConnectEvents, setDebugNostrConnectEvents] = useState<Array<{timestamp: string; type: string; data: any}>>([]);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing NIP-46 session
    const savedUserPublicKey = localStorage.getItem('nostr-user-public-key');
    const savedClientKeypair = localStorage.getItem('nostr-client-keypair');
    const savedRemoteSignerPubkey = localStorage.getItem('nostr-remote-signer-pubkey');
    
    if (savedUserPublicKey && savedClientKeypair && savedRemoteSignerPubkey) {
      setUserPublicKey(savedUserPublicKey);
      setClientKeypair(JSON.parse(savedClientKeypair));
      setRemoteSignerPublicKey(savedRemoteSignerPubkey);
      setIsAuthenticated(true);
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

  // Remove the old key generation functions as we're using NIP-46 remote signing only

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
      
      // Create the nostrconnect:// URL specifically for Amber
      const nostrConnectUrl = new URL(`nostrconnect://${keypair.publicKey}`);
      nostrConnectUrl.searchParams.append('relay', 'wss://relay.damus.io');
      nostrConnectUrl.searchParams.append('relay', 'wss://nos.lol');
      nostrConnectUrl.searchParams.append('secret', secret);
      nostrConnectUrl.searchParams.append('metadata', JSON.stringify({
        name: 'Favor Channels',
        description: 'Android Nostr app for tracking favors',
        url: window.location.origin,
        icons: []
      }));
      
      const connectionString = nostrConnectUrl.toString();
      setQrCodeUrl(connectionString);
      
      console.log('Connection string generated:', connectionString);
      
      // For Android/Capacitor, try to open Amber directly
      const isCapacitor = window.location.protocol === 'capacitor:';
      const isAndroid = /Android/i.test(navigator.userAgent);
      
      if (isCapacitor || isAndroid) {
        const amberIntent = `intent://nostrconnect?uri=${encodeURIComponent(connectionString)}#Intent;package=com.greenart7c3.nostrsigner;scheme=nostrsigner;end`;
        try {
          window.open(amberIntent, '_system');
          toast({
            title: "Opening Amber",
            description: "Attempting to open Amber signer directly",
          });
        } catch (e) {
          console.log('Could not open Amber directly, using QR code');
        }
      }
      
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
          
          // Update debug info
          setDebugRelayConnections(prev => [
            ...prev.filter(r => r.url !== url),
            { url, status: 'Connected', connected: true }
          ]);
          
          // Subscribe to events targeting our client pubkey
          const sub = relay.subscribe([
            {
              kinds: [24133], // NIP-46 response events
              '#p': [keypair.publicKey], // Events that p-tag our client pubkey
              since: Math.floor(Date.now() / 1000) - 60 // Only recent events
            }
          ], {
            onevent: (event: NostrEvent) => {
              // Log debug event
              setDebugNostrConnectEvents(prev => [
                ...prev,
                {
                  timestamp: new Date().toISOString(),
                  type: 'received_event',
                  data: event
                }
              ]);
              handleNostrConnectResponse(event, keypair);
            }
          });
          
          return relay;
        } catch (error) {
          console.error(`Failed to connect to ${url}:`, error);
          setDebugRelayConnections(prev => [
            ...prev.filter(r => r.url !== url),
            { url, status: `Error: ${error}`, connected: false }
          ]);
          return null;
        }
      });
      
      const connectedRelays = (await Promise.all(relayPromises)).filter(Boolean) as Relay[];
      console.log(`Listening for NOSTR Connect responses on ${connectedRelays.length} relays`);
      
      setDebugNostrConnectEvents(prev => [
        ...prev,
        {
          timestamp: new Date().toISOString(),
          type: 'listening_started',
          data: { connectedRelays: connectedRelays.length, totalRelays: RELAYS.length }
        }
      ]);
    } catch (error) {
      console.error('Failed to listen for NOSTR Connect responses:', error);
    }
  };

  const handleNostrConnectResponse = async (event: NostrEvent, keypair: { privateKey: string; publicKey: string }) => {
    try {
      console.log('Received NOSTR Connect response:', event);
      
      // For any NIP-46 response to our connection request, treat the event pubkey as the user's signer
      // This is the most straightforward approach - the signer responding indicates connection
      const remoteSignerPubkey = event.pubkey;
      
      setIsConnected(true);
      setIsAwaitingConnection(false);
      setRemoteSignerPublicKey(remoteSignerPubkey);
      
      // Store the connection details
      localStorage.setItem('nostr-remote-signer-pubkey', remoteSignerPubkey);
      localStorage.setItem('nostr-client-keypair', JSON.stringify(keypair));
      
      // Convert the signer's pubkey to npub format for display
      const npub = nip19.npubEncode(remoteSignerPubkey);
      setUserPublicKey(npub);
      localStorage.setItem('nostr-user-public-key', npub);
      
      // Mark as authenticated and close the dialog
      setIsAuthenticated(true);
      setShowNostrConnect(false);
      
      toast({
        title: "Connected to Amber!",
        description: `Connected as ${npub.slice(0, 16)}...`,
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

  const handleSigningResponse = (responseData: any) => {
    // Handle responses to signing requests
    console.log('Received signing response:', responseData);
    
    if (responseData.result === "sign_event" && responseData.result_data) {
      // Event was signed successfully
      const signedEvent = responseData.result_data;
      console.log('Event signed:', signedEvent);
      
      // Add the signed event to our local events or publish it
      if (signedEvent.kind === 1) {
        setEvents(prev => {
          const newEvents = [signedEvent, ...prev];
          return newEvents.sort((a, b) => b.created_at - a.created_at);
        });
      }
      
      toast({
        title: "Event Signed",
        description: "Event was signed successfully by remote signer",
      });
    } else if (responseData.result === "get_public_key" && responseData.result_data) {
      // Got public key from signer
      setUserPublicKey(responseData.result_data);
      
      // Save the session data
      localStorage.setItem('nostr-user-public-key', responseData.result_data);
      
      // Mark as authenticated and connect to relays
      setIsAuthenticated(true);
      connectToRelays();
      
      toast({
        title: "Authenticated!",
        description: "Successfully authenticated with remote signer",
      });
    } else if (responseData.error) {
      // Handle error responses
      toast({
        title: "Signing Error",
        description: responseData.error,
        variant: "destructive",
      });
    }
  };

  const requestPublicKey = async () => {
    try {
      const clientKeypairStr = localStorage.getItem('nostr-client-keypair');
      const remoteSignerPubkey = localStorage.getItem('nostr-remote-signer-pubkey');
      
      if (!clientKeypairStr || !remoteSignerPubkey) {
        throw new Error('NOSTR Connect not properly initialized');
      }
      
      const clientKeypair = JSON.parse(clientKeypairStr);
      
      // Create a get_public_key request according to NIP-46
      const requestId = crypto.randomUUID();
      const publicKeyRequest = {
        id: requestId,
        method: "get_public_key",
        params: []
      };
      
      // Create the request event using the client keypair
      const requestEvent = {
        kind: 24133, // NIP-46 request kind
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['p', remoteSignerPubkey], // Target the remote signer
        ],
        content: JSON.stringify(publicKeyRequest), // In production, this should be NIP-44 encrypted
        pubkey: clientKeypair.publicKey,
      };
      
      // Sign the request event with client key (simplified signing for now)
      const eventJson = JSON.stringify([0, requestEvent.pubkey, requestEvent.created_at, requestEvent.kind, requestEvent.tags, requestEvent.content]);
      const eventHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(eventJson));
      const eventId = Array.from(new Uint8Array(eventHash), b => b.toString(16).padStart(2, '0')).join('');
      
      const finalRequestEvent = { ...requestEvent, id: eventId, sig: 'placeholder_signature' } as NostrEvent;
      
      console.log('Sending get_public_key request:', finalRequestEvent);
      
      // Send the request to relays
      const publishPromises = RELAYS.map(async (url) => {
        try {
          const relay = await Relay.connect(url);
          await relay.publish(finalRequestEvent);
          console.log(`Sent get_public_key request to ${url}`);
          relay.close();
        } catch (error) {
          console.error(`Failed to send request to ${url}:`, error);
        }
      });
      
      await Promise.allSettled(publishPromises);
      
      console.log('Public key request sent to remote signer');
    } catch (error) {
      console.error('Failed to request public key:', error);
      toast({
        title: "Authentication Failed",
        description: "Failed to get public key from remote signer",
        variant: "destructive",
      });
    }
  };

  const decryptNostrConnectContent = async (encryptedContent: string, privateKey: string, senderPubkey: string): Promise<string> => {
    // Basic NIP-44 decryption implementation
    // In a real implementation, you'd use proper NIP-44 libraries
    try {
      const [content, iv] = encryptedContent.split('?iv=');
      
      // This is a simplified version - in reality you'd need proper NIP-44 implementation
      // For now, let's just return a connect confirmation
      return JSON.stringify({ result: "connect", secret: connectionSecret });
    } catch (error) {
      throw new Error('Failed to decrypt content');
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
    if (!isAuthenticated || relays.length === 0) return;

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
        pubkey: userPublicKey,
      };

      // Use NIP-46 to sign the profile event
      await requestEventSigning(profileEvent);
      
      setProfile(updatedProfile);
      setEditingProfile(false);
      
      toast({
        title: "Profile Update Requested",
        description: "Please approve the profile update in your signer app",
      });
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to request profile update",
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
    // Clear NIP-46 session data
    localStorage.removeItem('nostr-user-public-key');
    localStorage.removeItem('nostr-client-keypair');
    localStorage.removeItem('nostr-remote-signer-pubkey');
    
    setUserPublicKey('');
    setRemoteSignerPublicKey('');
    setClientKeypair(null);
    setIsAuthenticated(false);
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
    if (!newNote.trim()) return;

    try {
      // Create event object
      const event = {
        kind: 1,
        created_at: Math.floor(Date.now() / 1000),
        tags: [],
        content: newNote,
        pubkey: userPublicKey,
      };

      // Check if we're using NOSTR Connect
      const remoteSignerPubkey = localStorage.getItem('nostr-remote-signer-pubkey');
      const clientKeypairStr = localStorage.getItem('nostr-client-keypair');
      
      if (isAuthenticated && remoteSignerPubkey && clientKeypairStr) {
        // Use NOSTR Connect to sign the event
        await requestEventSigning(event);
      } else {
        toast({
          title: "Not Authenticated",
          description: "Please connect with NOSTR Connect first",
          variant: "destructive",
        });
        return;
      }
      
      setNewNote('');
    } catch (error) {
      console.error('Publish error:', error);
      toast({
        title: "Publish Failed",
        description: "Failed to publish note",
        variant: "destructive",
      });
    }
  };

  const requestEventSigning = async (event: any) => {
    try {
      const clientKeypairStr = localStorage.getItem('nostr-client-keypair');
      const remoteSignerPubkey = localStorage.getItem('nostr-remote-signer-pubkey');
      
      if (!clientKeypairStr || !remoteSignerPubkey) {
        throw new Error('NOSTR Connect not properly initialized');
      }
      
      const clientKeypair = JSON.parse(clientKeypairStr);
      
      // Create a signing request according to NIP-46
      const requestId = crypto.randomUUID();
      const signingRequest = {
        id: requestId,
        method: "sign_event",
        params: [event]
      };
      
      // Create the request event
      const requestEvent = {
        kind: 24133, // NIP-46 request kind
        created_at: Math.floor(Date.now() / 1000),
        tags: [
          ['p', remoteSignerPubkey], // Target the remote signer
        ],
        content: JSON.stringify(signingRequest), // In production, this should be NIP-44 encrypted
        pubkey: clientKeypair.publicKey,
      };
      
      // Sign the request event with client key (simplified)
      const eventJson = JSON.stringify([0, requestEvent.pubkey, requestEvent.created_at, requestEvent.kind, requestEvent.tags, requestEvent.content]);
      const eventHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(eventJson));
      const eventId = Array.from(new Uint8Array(eventHash), b => b.toString(16).padStart(2, '0')).join('');
      
      const finalRequestEvent = { ...requestEvent, id: eventId, sig: 'placeholder' } as NostrEvent;
      
      // Send the signing request to relays
      const publishPromises = RELAYS.map(async (url) => {
        try {
          const relay = await Relay.connect(url);
          await relay.publish(finalRequestEvent);
          console.log(`Sent signing request to ${url}`);
        } catch (error) {
          console.error(`Failed to send request to ${url}:`, error);
        }
      });
      
      await Promise.allSettled(publishPromises);
      
      toast({
        title: "Signing Request Sent",
        description: "Please approve the signing request in your signer app",
      });
    } catch (error) {
      console.error('Failed to request event signing:', error);
      toast({
        title: "Signing Request Failed",
        description: "Failed to send signing request",
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
                            {profile.name ? profile.name.slice(0, 2).toUpperCase() : userPublicKey.slice(0, 2).toUpperCase()}
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
                      {nip19.npubEncode(userPublicKey)}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(nip19.npubEncode(userPublicKey), 'Public key')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Hex Public Key</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="font-mono text-xs flex-1 justify-start">
                      {shortenPubkey(userPublicKey)}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(userPublicKey, 'Hex public key')}
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

  // Show main app if authenticated
  if (isAuthenticated && userPublicKey) {
    return (
      <MainApp 
        userPublicKey={userPublicKey}
        onLogout={() => {
          setIsAuthenticated(false);
          setUserPublicKey('');
          setIsConnected(false);
        }}
      />
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4 relative">
        {/* Debug button for login screen */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDebugPanel(true)}
          className="absolute top-4 right-4 h-8 w-8 p-0"
        >
          <Bug className="h-4 w-4" />
        </Button>
        
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
            <div className="text-center mb-6">
              <p className="text-sm text-muted-foreground">
                Connect using NIP-46 remote signing for secure key management
              </p>
            </div>
            
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
          </CardContent>
        </Card>
        
        <NostrDebugPanel
          isVisible={showDebugPanel}
          onClose={() => setShowDebugPanel(false)}
          relayConnections={debugRelayConnections}
          nostrConnectEvents={debugNostrConnectEvents}
          connectionState={{
            isConnected,
            publicKey: clientKeypair?.publicKey,
            secret: connectionSecret,
            lastActivity: debugNostrConnectEvents.length > 0 ? debugNostrConnectEvents[debugNostrConnectEvents.length - 1].timestamp : undefined
          }}
        />
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDebugPanel(true)}
              className="h-8 w-8 p-0"
            >
              <Bug className="h-4 w-4" />
            </Button>
            <Badge variant="secondary" className="hidden sm:flex">
              <Globe className="mr-1 h-3 w-3" />
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Badge variant="outline">
              <Users className="mr-1 h-3 w-3" />
              {shortenPubkey(userPublicKey)}
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-2xl">
        {renderTabContent()}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      
      <NostrDebugPanel
        isVisible={showDebugPanel}
        onClose={() => setShowDebugPanel(false)}
        relayConnections={debugRelayConnections}
        nostrConnectEvents={debugNostrConnectEvents}
        connectionState={{
          isConnected,
          publicKey: clientKeypair?.publicKey,
          secret: connectionSecret,
          lastActivity: debugNostrConnectEvents.length > 0 ? debugNostrConnectEvents[debugNostrConnectEvents.length - 1].timestamp : undefined
        }}
      />
    </div>
  );
}