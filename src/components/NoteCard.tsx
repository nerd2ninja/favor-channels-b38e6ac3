import { Button } from '@/components/ui/button';
import { Clock, Copy, Heart, MessageCircle, Repeat2 } from 'lucide-react';
import { Event } from 'nostr-tools';
import { useToast } from '@/hooks/use-toast';

interface NoteCardProps {
  note: Event;
  className?: string;
}

export default function NoteCard({ note, className = '' }: NoteCardProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatContent = (content: string) => {
    // Basic URL detection and linking
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">${url}</a>`;
    });
  };

  return (
    <div className={`group border border-border/50 rounded-lg p-4 space-y-3 bg-card hover:bg-card/80 transition-colors ${className}`}>
      {/* Note Content */}
      <div className="prose prose-sm max-w-none">
        <div 
          className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground"
          dangerouslySetInnerHTML={{ __html: formatContent(note.content) }}
        />
      </div>

      {/* Note Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        {/* Timestamp */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span title={new Date(note.created_at * 1000).toLocaleString()}>
            {formatDate(note.created_at)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Engagement Actions (placeholder for future features) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
              title="Like (coming soon)"
            >
              <Heart className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-blue-500"
              title="Reply (coming soon)"
            >
              <MessageCircle className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-green-500"
              title="Repost (coming soon)"
            >
              <Repeat2 className="w-3 h-3" />
            </Button>
          </div>
          
          {/* Copy Note ID */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyToClipboard(note.id, 'Note ID')}
            className="h-auto px-2 py-1 text-xs hover:bg-muted/50 text-muted-foreground"
            title="Copy note ID"
          >
            <Copy className="w-3 h-3 mr-1" />
            {note.id.slice(0, 8)}...
          </Button>
        </div>
      </div>
    </div>
  );
}