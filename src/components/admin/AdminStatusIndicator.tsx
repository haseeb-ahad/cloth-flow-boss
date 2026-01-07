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
      <div className="flex flex-col items-end text-right min-w-[70px]">
        <div 
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 border border-green-200"
          title="Online"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          {showLabel && (
            <span className="text-xs font-medium text-green-600">Online</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end text-right min-w-[70px]">
      <div className="flex items-center gap-1.5">
        <span 
          className="inline-block w-2 h-2 rounded-full bg-muted-foreground/50 shrink-0"
          title={`Offline - Last seen ${getLastSeenText()}`}
        />
        {showLabel && (
          <span className="text-xs font-medium text-muted-foreground">Offline</span>
        )}
      </div>
      {showLabel && lastSeen && (
        <span className="text-[10px] text-muted-foreground/70 leading-tight mt-0.5">
          {getLastSeenText()}
        </span>
      )}
    </div>
  );
};
