import { Home, Heart, User, Search, MessageSquare, GitBranch, Network } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'favors', label: 'Favors', icon: Heart },
  { id: 'favor-channels', label: 'Channels', icon: GitBranch },
  { id: 'favor-network', label: 'Network', icon: Network },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t border-border z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-[64px]",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon 
                className={cn(
                  "h-5 w-5 mb-1 transition-all duration-200",
                  isActive && "scale-110"
                )} 
              />
              <span className="text-xs font-medium">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}