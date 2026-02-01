'use client';

import { Copy, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ProofStatus = 'verified' | 'pending' | 'missing';

export type ProofRow = {
  label: string;
  value?: string;
  explorerUrl?: string;
  status?: ProofStatus;
};

interface ProofPanelProps {
  items: ProofRow[];
}

export function ProofPanel({ items }: ProofPanelProps) {
  async function copy(text?: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  }

  const statusToTone: Record<ProofStatus, Parameters<typeof Badge>[0]['tone']> = {
    verified: 'verified',
    pending: 'pending',
    missing: 'neutral'
  };

  return (
    <Card className="card">
      <CardHeader>
        <CardTitle>Proof</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const status = item.status ?? (item.value ? 'verified' : 'missing');
          return (
            <div key={item.label} className="flex flex-col gap-1 border border-[var(--border-light)] rounded-lg px-3 py-2 bg-[var(--bg-light)]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)]">{item.label}</span>
                <Badge tone={statusToTone[status]}>{status === 'missing' ? 'Not executed yet' : status}</Badge>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <code className="mono text-sm text-[var(--text-primary)] break-all">
                  {item.value ?? '—'}
                </code>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[var(--text-secondary)]"
                    onClick={() => copy(item.value)}
                    disabled={!item.value}
                  >
                    <Copy className="h-4 w-4" /> Copy
                  </Button>
                  {item.explorerUrl && (
                    <a
                      className={cn(
                        'text-xs px-3 py-2 rounded-md border border-[var(--border-light)] hover:border-[var(--accent-teal)] text-[var(--text-primary)] flex items-center gap-1'
                      )}
                      href={item.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" /> Explorer
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
