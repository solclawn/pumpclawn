import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';

const plex = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-mono' });
const space = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans' });

export const metadata: Metadata = {
  metadataBase: new URL('https://solclawn.com'),
  title: 'Solclawn | Pump.fun launcher with onchain fee routing',
  description: 'Launch Pump.fun tokens on Solana, claim creator fees, and route them onchain with proof-first UX.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Solclawn',
    title: 'Solclawn | Pump.fun launcher with onchain fee routing',
    description: 'Launch Pump.fun tokens on Solana, claim creator fees, and route them onchain with proof-first UX.',
    url: 'https://solclawn.com/',
    images: [
      {
        url: '/social-card-solclawn-1600x630.png?v=2',
        width: 1600,
        height: 630,
        alt: 'Solclawn — Pump.fun launcher with proof-first UX'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Solclawn | Pump.fun launcher with onchain fee routing',
    description: 'Launch Pump.fun tokens on Solana, claim creator fees, and route them onchain with proof-first UX.',
    images: ['/social-card-solclawn-1600x630.png?v=2']
  },
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' }
    ],
    apple: [
      { url: '/favicon.png', type: 'image/png' }
    ]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plex.variable} ${space.variable}`}>
      <body className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}
