'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';

const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

export function ClaimButtons({ mint }: { mint: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const call = (path: string) => {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch(`${apiBase}/api/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mint })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data?.message || 'Request failed');
        return;
      }
      setMessage(path.includes('claim') ? data.claim_signature : data.distribution_signature);
    });
  };

  return (
    <div className="flex gap-3 items-center">
      <Button className="flex-1" disabled={pending} onClick={() => call('fees/claim')}>
        {pending ? 'Claiming...' : 'Claim creator fees'}
      </Button>
      <Button variant="secondary" className="flex-1" disabled={pending} onClick={() => call('fees/distribute')}>
        {pending ? 'Distributing...' : 'Distribute split'}
      </Button>
      {message && <span className="text-xs text-[var(--text-secondary)] mono break-all">{message}</span>}
    </div>
  );
}
