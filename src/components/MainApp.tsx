import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import UserProfile from './UserProfile';
import FavorsTab from './FavorsTab';
import FavorChannelsTab from './FavorChannelsTab';
import FavorNetworkTab from './FavorNetworkTab';
import BottomNav from './BottomNav';
import { Button } from '@/components/ui/button';
import { LogOut, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface MainAppProps {
  userPublicKey: string;
  onLogout: () => void;
}

export default function MainApp({ userPublicKey, onLogout }: MainAppProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({
    name: '',
    about: '',
    picture: '',
    banner: '',
    website: '',
    nip05: '',
    location: '',
    lud16: ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Load profile from localStorage if available
    const savedProfile = localStorage.getItem(`nostr-profile-${userPublicKey}`);
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (error) {
        console.error('Failed to parse saved profile:', error);
      }
    }
  }, [userPublicKey]);

  const handleProfileUpdate = (updatedProfile: any) => {
    setProfile(updatedProfile);
    // Save to localStorage
    localStorage.setItem(`nostr-profile-${userPublicKey}`, JSON.stringify(updatedProfile));
    
    // Here you would typically publish a kind 0 event to update the profile on Nostr
    // For now, we'll just save locally
    toast({
      title: "Profile Updated",
      description: "Profile saved locally. Publishing to Nostr will be implemented in Phase 2.",
    });
  };

  const handleLogout = () => {
    // Clear all session data
    localStorage.removeItem('nostr-user-public-key');
    localStorage.removeItem('nostr-client-keypair');
    localStorage.removeItem('nostr-remote-signer-pubkey');
    
    toast({
      title: "Logged Out",
      description: "Successfully logged out from Amber",
    });
    
    onLogout();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <UserProfile
            userPublicKey={userPublicKey}
            profile={profile}
            onProfileUpdate={handleProfileUpdate}
            isEditing={isEditingProfile}
            setIsEditing={setIsEditingProfile}
          />
        );
      case 'favors':
        return <FavorsTab />;
      case 'channels':
        return <FavorChannelsTab />;
      case 'network':
        return <FavorNetworkTab />;
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Select a tab to get started</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold">Favor Channels</h1>
          
          <div className="flex items-center gap-2">
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Account</h4>
                    <p className="text-sm text-muted-foreground">
                      Connected via Amber with npub: {userPublicKey.slice(0, 8)}...
                    </p>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <Button 
                      variant="destructive" 
                      onClick={handleLogout}
                      className="w-full"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-20">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}