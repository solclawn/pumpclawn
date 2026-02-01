import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

const endpoints = [
  { method: 'POST', path: '/api/launch', desc: 'Create token on Pump.fun and optional router' },
  { method: 'POST', path: '/api/fees/claim', desc: 'Claim creator fees' },
  { method: 'POST', path: '/api/fees/distribute', desc: 'Route to Fee Router and split' },
  { method: 'GET', path: '/api/token/:mint', desc: 'Token details + proofs' },
  { method: 'GET', path: '/api/fees/:mint', desc: 'Claimable + last proofs' },
  { method: 'GET', path: '/api/tokens', desc: 'List tokens launched via Solclawn' }
];

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 space-y-8">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Docs</p>
        <h1 className="text-3xl font-[var(--font-display)]">Solclawn API</h1>
        <p className="text-[var(--text-secondary)]">Pump.fun launcher with onchain fee routing. See repo docs/solclaw.md for full text.</p>
        <Link className="text-sm text-[var(--accent-start)] underline" href="/docs/solclaw.md" prefetch={false}>
          Raw markdown (repo path: docs/solclaw.md)
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
          <CardDescription>Proof-first responses with signatures.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {endpoints.map((e) => (
            <div key={e.path} className="flex justify-between border border-[var(--border)] rounded-lg px-4 py-3 text-sm">
              <span className="mono text-[var(--text-secondary)]">{e.method}</span>
              <span className="mono">{e.path}</span>
              <span className="text-[var(--text-secondary)]">{e.desc}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
