import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const plex = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Solclawn | Pump.fun launcher with onchain fee routing',
  description: 'Launch Pump.fun tokens on Solana, claim creator fees, and route them onchain with proof-first UX.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={plex.variable}>
      <body className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}
