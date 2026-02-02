import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProofPanel, type ProofRow } from '@/components/proof/panel';
import { Stepper, type Step } from '@/components/ui/stepper';
import { SplitTable } from '@/components/split-table';
import { Badge } from '@/components/ui/badge';
import { ClaimButtons } from './claim-buttons';

export type ApiToken = {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  creator_wallet: string;
  router_pda?: string;
  pumpfun_url: string;
  proofs: {
    mint_tx?: string;
    router_init_tx?: string;
    last_claim?: string;
    last_distribute?: string;
  };
  fee_split: { wallet: string; bps: number }[];
  created_at: string;
  claimable: number;
};

const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

async function fetchToken(mint: string): Promise<ApiToken | null> {
  try {
    const res = await fetch(`${apiBase}/api/token/${mint}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function stepFromProofs(token: ApiToken): Step {
  if (token.proofs.last_distribute) return 'Distributed';
  if (token.proofs.last_claim) return 'Claimed';
  if (token.proofs.mint_tx) return 'Minted';
  return 'Draft';
}

export default async function TokenPage({ params }: { params: { mint: string } }) {
  const mint = params.mint === 'demo' ? 'So11111111111111111111111111111111111111112' : params.mint;
  const token = await fetchToken(mint);
  if (!token) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="text-xl font-semibold">Token unavailable</h1>
        <p className="text-[var(--text-secondary)] mt-2">
          The API is unreachable or the mint was not found. Make sure the API is running on
          <span className="mono"> {apiBase}</span>.
        </p>
      </main>
    );
  }

  const step = stepFromProofs(token);

  const proofItems = [
    {
      label: 'Mint address',
      value: token.mint,
      explorerUrl: `https://explorer.solana.com/address/${token.mint}`,
      status: 'verified' as const
    },
    {
      label: 'Creator wallet',
      value: token.creator_wallet,
      explorerUrl: `https://explorer.solana.com/address/${token.creator_wallet}`,
      status: 'verified' as const
    },
    {
      label: 'Router PDA',
      value: token.router_pda,
      explorerUrl: token.router_pda ? `https://explorer.solana.com/address/${token.router_pda}` : undefined,
      status: token.router_pda ? 'verified' : 'missing'
    },
    {
      label: 'Last claim signature',
      value: token.proofs.last_claim,
      explorerUrl: token.proofs.last_claim
        ? `https://explorer.solana.com/tx/${token.proofs.last_claim}`
        : undefined,
      status: token.proofs.last_claim ? 'verified' : 'missing'
    },
    {
      label: 'Last distribute signature',
      value: token.proofs.last_distribute,
      explorerUrl: token.proofs.last_distribute
        ? `https://explorer.solana.com/tx/${token.proofs.last_distribute}`
        : undefined,
      status: token.proofs.last_distribute ? 'verified' : 'missing'
    }
  ] satisfies ProofRow[];

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Token</p>
          <h1 className="text-3xl font-[var(--font-display)]">{token.name}</h1>
          <p className="text-[var(--text-secondary)]">{token.description}</p>
        </div>
        <Badge tone="verified">Creator fee sharing enabled</Badge>
      </div>

      <Stepper current={step} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{token.symbol}</CardTitle>
                  <CardDescription>{token.pumpfun_url}</CardDescription>
                </div>
                <a
                  className="text-sm rounded-full border border-[var(--border)] px-3 py-2 hover:border-[var(--accent-start)]"
                  href={token.pumpfun_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Pump.fun
                </a>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-48 rounded-xl border border-[var(--border)] bg-black/20 flex items-center justify-center text-[var(--text-secondary)]">
                Chart placeholder
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-xl border border-[var(--border)]">
                  <p className="text-[var(--text-secondary)]">Claimable creator fees</p>
                  <p className="text-xl font-semibold mono">{token.claimable} lamports</p>
                </div>
                <div className="p-3 rounded-xl border border-[var(--border)]">
                  <p className="text-[var(--text-secondary)]">Status</p>
                  <p className="text-xl font-semibold">{step}</p>
                </div>
              </div>
              <ClaimButtons mint={token.mint} />
            </CardContent>
          </Card>

          <SplitTable recipients={token.fee_split} />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            <span>Fees & Proofs</span>
            <span className="badge">on-chain</span>
          </div>
          <ProofPanel items={proofItems} />
        </div>
      </div>
    </main>
  );
}
