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

  return (
    <div className="flex items-center gap-2">
      <span 
        className={`inline-block w-2.5 h-2.5 rounded-full ${
          isOnline 
            ? 'bg-green-500 animate-pulse' 
            : 'bg-gray-400'
        }`}
        title={isOnline ? 'Online' : `Offline - Last seen ${getLastSeenText()}`}
      />
      {showLabel && (
        <span className={`text-sm ${isOnline ? 'text-green-600' : 'text-muted-foreground'}`}>
          {isOnline ? 'Online' : (
            <span className="flex flex-col">
              <span>Offline</span>
              {lastSeen && (
                <span className="text-xs text-muted-foreground">
                  {getLastSeenText()}
                </span>
              )}
            </span>
          )}
        </span>
      )}
    </div>
  );
};
