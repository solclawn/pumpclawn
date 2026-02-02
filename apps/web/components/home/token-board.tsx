'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type TokenItem = {
  mint: string;
  name?: string;
  symbol: string;
  agent?: string;
  launchedAt?: string;
  marketCap?: number;
  priceUsd?: number;
  priceChange24h?: number;
  moltbookUrl?: string;
  tradeUrl?: string;
};

type StatsPayload = {
  success: boolean;
  totalMarketCap?: number;
  totalVolume24h?: number;
  tokenCount?: number;
  updatedAt?: string;
  agentFeesEarned?: { usdValue?: number } | null;
  topTokens?: TokenItem[];
  allTokens?: TokenItem[];
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

type SortKey = 'new' | 'old' | 'high' | 'low';

function formatUsd(num?: number) {
  if (!num) return '$0';
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}

function formatPrice(price?: number) {
  if (!price) return '-';
  const num = price;
  if (num < 0.0000001) return `$0.0000000${Math.round(num * 10000000000)}`;
  if (num < 0.000001) return `$0.000000${Math.round(num * 1000000000)}`;
  if (num < 0.00001) return `$0.00000${Math.round(num * 100000000)}`;
  if (num < 0.0001) return `$0.0000${Math.round(num * 10000000)}`;
  if (num < 0.001) return `$${num.toFixed(7)}`;
  if (num < 0.01) return `$${num.toFixed(6)}`;
  if (num < 1) return `$${num.toFixed(4)}`;
  return `$${num.toFixed(2)}`;
}

function formatChange(change?: number) {
  if (change === undefined || change === null) return null;
  const sign = change >= 0 ? '+' : '';
  const color = change >= 0 ? 'var(--accent-teal)' : 'var(--accent-red)';
  return (
    <span style={{ color, fontSize: '11px' }}>{sign}{change.toFixed(1)}%</span>
  );
}

function sortTokens(tokens: TokenItem[], sortType: SortKey) {
  const sorted = [...tokens];
  switch (sortType) {
    case 'new':
      return sorted.sort((a, b) => new Date(b.launchedAt || 0).getTime() - new Date(a.launchedAt || 0).getTime());
    case 'old':
      return sorted.sort((a, b) => new Date(a.launchedAt || 0).getTime() - new Date(b.launchedAt || 0).getTime());
    case 'high':
      return sorted.sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));
    case 'low':
      return sorted.sort((a, b) => (a.marketCap || 0) - (b.marketCap || 0));
    default:
      return sorted;
  }
}

export function TokenBoard() {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('new');
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setError(null);
      const res = await fetch(`${apiBase}/api/stats`, { cache: 'no-store' });
      const data = (await res.json()) as StatsPayload;
      if (!data.success) throw new Error('stats failed');
      setStats(data);
    } catch (err) {
      setError('Failed to load stats');
    }
  };

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const sortedTokens = useMemo(() => {
    if (!stats?.allTokens) return [];
    return sortTokens(stats.allTokens, sortKey);
  }, [stats, sortKey]);

  return (
    <section>
      <Card id="token-list">
        <CardHeader className="bg-[var(--bg-dark)]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[var(--text-light)] text-sm">All Tokens</CardTitle>
            <span className="text-[var(--accent-teal)] text-xs">{stats?.tokenCount ?? 0} total</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            {(['new', 'old', 'high', 'low'] as SortKey[]).map((key) => (
              <button
                key={key}
                className={`px-3 py-1 rounded-md text-xs border ${sortKey === key ? 'bg-[var(--accent-teal)] text-[var(--bg-dark)] border-[var(--accent-teal)]' : 'bg-[var(--bg-light)] text-[var(--text-secondary)] border-[var(--border-light)]'}`}
                onClick={() => setSortKey(key)}
              >
                {key}
              </button>
            ))}
          </div>
          <div className="space-y-3 max-h-[720px] overflow-y-auto">
            {sortedTokens.length === 0 && <div className="text-[var(--text-secondary)]">No tokens launched yet.</div>}
            {sortedTokens.map((token) => {
              const date = token.launchedAt ? new Date(token.launchedAt) : null;
              const dateStr = date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
              return (
                <div key={token.mint} className="flex items-center justify-between bg-[var(--bg-light)] rounded-md px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--accent-teal)]">${token.symbol} {formatChange(token.priceChange24h)}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{token.name || token.symbol}</div>
                    <div className="text-xs text-[var(--text-muted)]">by {token.agent || 'agent'} · {dateStr}{token.marketCap ? ` · ${formatUsd(token.marketCap)}` : ''}</div>
                  </div>
                  <div className="flex gap-2">
                    {token.moltbookUrl && (
                      <a href={token.moltbookUrl} target="_blank" className="text-xs bg-[var(--bg-dark-secondary)] text-white px-3 py-2 rounded-md">Post</a>
                    )}
                    <a href={token.tradeUrl || `/token/${token.mint}`} className="text-xs bg-[var(--accent-teal)] text-[var(--bg-dark)] px-3 py-2 rounded-md">Trade</a>
                    <Button variant="secondary" asChild>
                      <Link href={`/token/${token.mint}`}>View</Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
