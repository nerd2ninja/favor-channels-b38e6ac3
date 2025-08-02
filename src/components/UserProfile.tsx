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
import { User, Edit, Copy, Globe, Mail, MapPin } from 'lucide-react';
import { nip19 } from 'nostr-tools';

interface UserProfileProps {
  userPublicKey: string;
  profile: {
    name: string;
    about: string;
    picture: string;
    banner: string;
    website: string;
    nip05: string;
    location?: string;
    lud16?: string;
  };
  onProfileUpdate: (profile: any) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
}

export default function UserProfile({ 
  userPublicKey, 
  profile, 
  onProfileUpdate, 
  isEditing, 
  setIsEditing 
}: UserProfileProps) {
  const [editedProfile, setEditedProfile] = useState(profile);
  const { toast } = useToast();

  useEffect(() => {
    setEditedProfile(profile);
  }, [profile]);

  const npub = userPublicKey ? nip19.npubEncode(userPublicKey) : '';

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const handleSaveProfile = () => {
    onProfileUpdate(editedProfile);
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your profile has been updated successfully",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Profile Header Card */}
      <Card className="relative overflow-hidden">
        {/* Banner */}
        <div 
          className="h-32 bg-gradient-to-r from-primary/20 to-primary/10 relative"
          style={{
            backgroundImage: profile.banner ? `url(${profile.banner})` : undefined,
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
              <AvatarImage src={profile.picture} alt={profile.name || 'User'} />
              <AvatarFallback className="text-xl font-semibold">
                {profile.name ? getInitials(profile.name) : <User className="w-8 h-8" />}
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
                {profile.name || 'Anonymous User'}
              </h1>
              {profile.nip05 && (
                <Badge variant="secondary" className="mt-1">
                  <Mail className="w-3 h-3 mr-1" />
                  {profile.nip05}
                </Badge>
              )}
            </div>
            
            {profile.about && (
              <p className="text-muted-foreground leading-relaxed">
                {profile.about}
              </p>
            )}
            
            {/* Profile Links */}
            <div className="flex flex-wrap gap-2">
              {profile.website && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(profile.website, '_blank')}
                  className="text-xs"
                >
                  <Globe className="w-3 h-3 mr-1" />
                  Website
                </Button>
              )}
              {profile.location && (
                <Badge variant="outline">
                  <MapPin className="w-3 h-3 mr-1" />
                  {profile.location}
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