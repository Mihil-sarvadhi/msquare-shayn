import React from 'react';
import { ConnectorHealth } from '../hooks/useDashboard';

interface ConnectorStatusProps {
  health: ConnectorHealth[];
}

export default function ConnectorStatus({ health }: ConnectorStatusProps) {
  const dotColor = (status: string) => {
    if (status === 'green') return 'bg-emerald';
    if (status === 'amber') return 'bg-amber';
    return 'bg-ruby';
  };

  return (
    <div className="space-y-2">
      {health.map((h) => (
        <div key={h.connector_name} className="flex justify-between items-center">
          <span className="text-sm capitalize text-muted">{h.connector_name.replace('_', ' ')}</span>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${dotColor(h.status)}`} />
            <span className="text-xs text-muted">
              {h.last_sync_at ? new Date(h.last_sync_at).toLocaleTimeString() : 'Never'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
