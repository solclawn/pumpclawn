import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface RecipientRow {
  wallet: string;
  bps: number;
}

export function SplitTable({ recipients }: { recipients: RecipientRow[] }) {
  const total = recipients.reduce((sum, r) => sum + r.bps, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee Split</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
          <span>Recipients</span>
          <span>Total: {(total / 100).toFixed(2)}%</span>
        </div>
        <div className="space-y-2">
          {recipients.map((r) => (
            <div
              key={r.wallet}
              className="flex flex-col gap-1 rounded-lg border border-[var(--border-light)] px-3 py-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Wallet</span>
                <span className="text-[var(--text-primary)] mono break-all">{r.wallet}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)]">Share</span>
                <span className="text-[var(--text-primary)]">{(r.bps / 100).toFixed(2)}%</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
