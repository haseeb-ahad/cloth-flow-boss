import { useOffline } from '@/contexts/OfflineContext';
import { WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, lastSyncTime, triggerSync } = useOffline();

  // If online with no pending changes and recently synced, show success
  if (isOnline && pendingCount === 0 && !isSyncing) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1.5 bg-green-500/10 text-green-600 border-green-500/30">
              <Cloud className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Synced</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>All data synced</p>
            {lastSyncTime && (
              <p className="text-xs text-muted-foreground">
                Last sync: {lastSyncTime.toLocaleTimeString()}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Offline indicator
  if (!isOnline) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1.5 bg-amber-500/10 text-amber-600 border-amber-500/30">
              <WifiOff className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Offline</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-xs">
                  {pendingCount}
                </span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>You're offline</p>
            {pendingCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {pendingCount} changes pending sync
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Syncing indicator
  if (isSyncing) {
    return (
      <Badge variant="outline" className="gap-1.5 bg-blue-500/10 text-blue-600 border-blue-500/30">
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span className="hidden sm:inline">Syncing...</span>
      </Badge>
    );
  }

  // Online with pending changes
  if (pendingCount > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={triggerSync}
              className="h-auto py-1 px-2"
            >
              <Badge variant="outline" className="gap-1.5 bg-orange-500/10 text-orange-600 border-orange-500/30 cursor-pointer">
                <CloudOff className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Pending</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-orange-500/20 text-xs">
                  {pendingCount}
                </span>
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{pendingCount} changes pending sync</p>
            <p className="text-xs text-muted-foreground">Click to sync now</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
}
