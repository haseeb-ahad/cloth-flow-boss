import { formatDistanceToNow } from 'date-fns';

interface AdminStatusIndicatorProps {
  status: 'online' | 'offline';
  lastSeen?: string | null;
  showLabel?: boolean;
}

export const AdminStatusIndicator = ({ 
  status, 
  lastSeen, 
  showLabel = true 
}: AdminStatusIndicatorProps) => {
  const isOnline = status === 'online';
  
  const getLastSeenText = () => {
    if (!lastSeen) return '';
    try {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true });
    } catch {
      return '';
    }
  };

  if (isOnline) {
    return (
      <div 
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 border border-success/20 animate-pulse"
        title="Online"
      >
        <span className="w-2 h-2 rounded-full bg-success animate-ping" />
        <span className="w-2 h-2 rounded-full bg-success absolute" />
        {showLabel && (
          <span className="text-sm font-medium text-success">Active</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span 
        className="inline-block w-2.5 h-2.5 rounded-full bg-muted-foreground/50"
        title={`Offline - Last seen ${getLastSeenText()}`}
      />
      {showLabel && (
        <span className="text-sm text-muted-foreground">
          <span className="flex flex-col">
            <span>Offline</span>
            {lastSeen && (
              <span className="text-xs text-muted-foreground">
                {getLastSeenText()}
              </span>
            )}
          </span>
        </span>
      )}
    </div>
  );
};
