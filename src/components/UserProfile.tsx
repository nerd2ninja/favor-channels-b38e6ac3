import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useNostrProfile } from '@/hooks/useNostrProfile';
import { User, Edit, Copy, Globe, Mail, MapPin, RefreshCw, Loader2 } from 'lucide-react';
import { nip19 } from 'nostr-tools';

interface UserProfileProps {
  userPublicKey: string;
  nostrSigning: {
    signEvent: (event: any) => Promise<any>;
    isConnected: boolean;
  };
}

export default function UserProfile({ 
  userPublicKey, 
  nostrSigning
}: UserProfileProps) {
  const { profile, loading, error, updateProfile, refreshProfile } = useNostrProfile(userPublicKey);
  const [editedProfile, setEditedProfile] = useState({
    name: '',
    about: '',
    picture: '',
    banner: '',
    website: '',
    nip05: '',
    location: '',
    lud16: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      setEditedProfile({
        name: profile.name || profile.display_name || '',
        about: profile.about || '',
        picture: profile.picture || '',
        banner: profile.banner || '',
        website: profile.website || '',
        nip05: profile.nip05 || '',
        location: profile.location || '',
        lud16: profile.lud16 || ''
      });
    }
  }, [profile]);

  const npub = userPublicKey ? nip19.npubEncode(userPublicKey) : '';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleSaveProfile = async () => {
    if (!nostrSigning.isConnected) {
      toast({
        title: "Not Connected",
        description: "Please connect to Amber first",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateProfile(editedProfile, nostrSigning.signEvent);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
            <h3 className="text-lg font-semibold mb-2">Loading Profile</h3>
            <p className="text-muted-foreground">
              Fetching your profile from the Nostr network...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentProfile = profile || {
    name: '',
    about: '',
    picture: '',
    banner: '',
    website: '',
    nip05: '',
    location: '',
    lud16: ''
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-destructive">Profile Load Error</h4>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button onClick={refreshProfile} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Header Card */}
      <Card className="relative overflow-hidden">
        {/* Banner */}
        <div 
          className="h-32 bg-gradient-to-r from-primary/20 to-primary/10 relative"
          style={{
            backgroundImage: currentProfile.banner ? `url(${currentProfile.banner})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="absolute inset-0 bg-black/20" />
        </div>
        
        <CardContent className="relative pb-6">
          {/* Avatar */}
          <div className="flex justify-between items-start -mt-16 mb-4">
            <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
              <AvatarImage src={currentProfile.picture} alt={currentProfile.name || 'User'} />
              <AvatarFallback className="text-xl font-semibold">
                {currentProfile.name ? getInitials(currentProfile.name) : <User className="w-8 h-8" />}
              </AvatarFallback>
            </Avatar>
            
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="mt-12">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={editedProfile.name}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your display name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="about">About</Label>
                    <Textarea
                      id="about"
                      value={editedProfile.about}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, about: e.target.value }))}
                      placeholder="Tell us about yourself"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="picture">Profile Picture URL</Label>
                    <Input
                      id="picture"
                      value={editedProfile.picture}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, picture: e.target.value }))}
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="banner">Banner Image URL</Label>
                    <Input
                      id="banner"
                      value={editedProfile.banner}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, banner: e.target.value }))}
                      placeholder="https://example.com/banner.jpg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={editedProfile.website}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://yourwebsite.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="nip05">NIP-05 Address</Label>
                    <Input
                      id="nip05"
                      value={editedProfile.nip05}
                      onChange={(e) => setEditedProfile(prev => ({ ...prev, nip05: e.target.value }))}
                      placeholder="you@yourdomain.com"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveProfile} className="flex-1">
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {/* Profile Info */}
          <div className="space-y-3">
            <div>
              <h1 className="text-2xl font-bold">
                {currentProfile.name || currentProfile.display_name || 'Anonymous User'}
              </h1>
              {currentProfile.nip05 && (
                <Badge variant="secondary" className="mt-1">
                  <Mail className="w-3 h-3 mr-1" />
                  {currentProfile.nip05}
                </Badge>
              )}
            </div>
            
            {currentProfile.about && (
              <p className="text-muted-foreground leading-relaxed">
                {currentProfile.about}
              </p>
            )}
            
            {/* Profile Links */}
            <div className="flex flex-wrap gap-2">
              {currentProfile.website && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(currentProfile.website, '_blank')}
                  className="text-xs"
                >
                  <Globe className="w-3 h-3 mr-1" />
                  Website
                </Button>
              )}
              {currentProfile.location && (
                <Badge variant="outline">
                  <MapPin className="w-3 h-3 mr-1" />
                  {currentProfile.location}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Public Key Card */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Public Key Information</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">
              Public Key (npub)
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                {npub}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(npub, 'Public key')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-muted-foreground">
              Hex Public Key
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                {userPublicKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(userPublicKey, 'Hex public key')}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}