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
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 border border-green-200 animate-pulse"
        title="Online"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        {showLabel && (
          <span className="text-sm font-medium text-green-600">Active</span>
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
