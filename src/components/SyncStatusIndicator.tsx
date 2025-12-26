// Sync status indicator component with visual states
import React, { useState, useEffect } from 'react';
import { RefreshCw, Check, AlertTriangle, Clock, Wifi, WifiOff, ChevronDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useOffline } from '@/contexts/OfflineContext';
import { getSyncQueueStats, getAllSyncItems, retryFailedItem, type SyncQueueItem } from '@/lib/syncQueue';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface SyncStats {
  pending: number;
  syncing: number;
  failed: number;
  total: number;
}

export function SyncStatusIndicator() {
  const { isOnline, isSyncing, triggerSync } = useOffline();
  const [stats, setStats] = useState<SyncStats>({ pending: 0, syncing: 0, failed: 0, total: 0 });
  const [failedItems, setFailedItems] = useState<SyncQueueItem[]>([]);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  // Refresh stats periodically
  useEffect(() => {
    const refreshStats = async () => {
      try {
        const queueStats = await getSyncQueueStats();
        setStats(queueStats);
        
        if (queueStats.failed > 0) {
          const items = await getAllSyncItems();
          setFailedItems(items.filter(i => i.status === 'failed'));
        } else {
          setFailedItems([]);
        }
      } catch (e) {
        console.error('Error fetching sync stats:', e);
      }
    };

    refreshStats();
    const interval = setInterval(refreshStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (itemId: string) => {
    setIsRetrying(itemId);
    try {
      const success = await retryFailedItem(itemId);
      if (success) {
        toast({
          title: "Sync successful",
          description: "Item has been synced",
        });
      } else {
        toast({
          title: "Sync failed",
          description: "Item could not be synced, will retry later",
          variant: "destructive",
        });
      }
    } finally {
      setIsRetrying(null);
    }
  };

  const handleRetryAll = async () => {
    await triggerSync();
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-muted text-muted-foreground';
    if (isSyncing || stats.syncing > 0) return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    if (stats.failed > 0) return 'bg-destructive/10 text-destructive border-destructive/20';
    if (stats.pending > 0) return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
    return 'bg-green-500/10 text-green-600 border-green-500/20';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="h-3.5 w-3.5" />;
    if (isSyncing || stats.syncing > 0) return <RefreshCw className="h-3.5 w-3.5 animate-spin" />;
    if (stats.failed > 0) return <AlertTriangle className="h-3.5 w-3.5" />;
    if (stats.pending > 0) return <Clock className="h-3.5 w-3.5" />;
    return <Check className="h-3.5 w-3.5" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (isSyncing || stats.syncing > 0) return 'Syncing...';
    if (stats.failed > 0) return `${stats.failed} Failed`;
    if (stats.pending > 0) return `${stats.pending} Pending`;
    return 'Synced';
  };

  const hasIssues = stats.failed > 0 || stats.pending > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-2 px-3 border transition-colors',
            getStatusColor()
          )}
        >
          {getStatusIcon()}
          <span className="text-xs font-medium">{getStatusText()}</span>
          {hasIssues && <ChevronDown className="h-3 w-3 opacity-50" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Sync Status</span>
            <Badge variant={isOnline ? "default" : "secondary"} className="text-xs">
              {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-md bg-muted/50">
              <div className="text-lg font-semibold text-orange-600">{stats.pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <div className="text-lg font-semibold text-blue-600">{stats.syncing}</div>
              <div className="text-xs text-muted-foreground">Syncing</div>
            </div>
            <div className="p-2 rounded-md bg-muted/50">
              <div className="text-lg font-semibold text-destructive">{stats.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>
        </div>
        
        {failedItems.length > 0 && (
          <>
            <div className="p-2 max-h-48 overflow-y-auto">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
                Failed Items
              </div>
              {failedItems.slice(0, 5).map((item) => (
                <div 
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {item.action_type} {item.entity_type}
                    </div>
                    <div className="text-muted-foreground truncate">
                      {item.error_message || 'Unknown error'}
                    </div>
                    <div className="text-muted-foreground">
                      Retry {item.retry_count}/{item.max_retries}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 ml-2"
                    disabled={isRetrying === item.id || !isOnline}
                    onClick={() => handleRetry(item.id)}
                  >
                    <RotateCcw className={cn(
                      "h-3.5 w-3.5",
                      isRetrying === item.id && "animate-spin"
                    )} />
                  </Button>
                </div>
              ))}
              {failedItems.length > 5 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  +{failedItems.length - 5} more
                </div>
              )}
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        
        <div className="p-2">
          <Button
            size="sm"
            className="w-full"
            disabled={!isOnline || isSyncing || (stats.pending === 0 && stats.failed === 0)}
            onClick={handleRetryAll}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing && "animate-spin")} />
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Inline sync status badge for individual items
export function ItemSyncBadge({ status }: { status: 'pending' | 'syncing' | 'synced' | 'failed' | 'error' }) {
  const getConfig = () => {
    switch (status) {
      case 'pending':
        return { 
          color: 'bg-orange-500/10 text-orange-600 border-orange-500/20', 
          icon: <Clock className="h-3 w-3" />,
          label: 'Pending'
        };
      case 'syncing':
        return { 
          color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', 
          icon: <RefreshCw className="h-3 w-3 animate-spin" />,
          label: 'Syncing'
        };
      case 'synced':
        return { 
          color: 'bg-green-500/10 text-green-600 border-green-500/20', 
          icon: <Check className="h-3 w-3" />,
          label: 'Synced'
        };
      case 'failed':
      case 'error':
        return { 
          color: 'bg-destructive/10 text-destructive border-destructive/20', 
          icon: <AlertTriangle className="h-3 w-3" />,
          label: 'Failed'
        };
      default:
        return { 
          color: 'bg-muted text-muted-foreground', 
          icon: null,
          label: status
        };
    }
  };

  const config = getConfig();
  
  return (
    <Badge variant="outline" className={cn('gap-1 text-xs', config.color)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
