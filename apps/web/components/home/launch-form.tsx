'use client';

import { useMemo, useState, useTransition } from 'react';
import { Keypair } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { getPhantom, sendSignedTx } from '@/lib/solana';

const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';
const botName = process.env.NEXT_PUBLIC_BOT_NAME || 'solclawnbot';

export function LaunchForm() {
  const [postId, setPostId] = useState('');
  const [postUrl, setPostUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [wallet, setWallet] = useState<string | null>(null);
  const [devBuy, setDevBuy] = useState('0.1');

  const [name, setName] = useState('TEST');
  const [symbol, setSymbol] = useState('TEST');
  const [description, setDescription] = useState('First test deploy on Pump.fun');
  const [image, setImage] = useState('https://placehold.co/512x512.png');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [telegram, setTelegram] = useState('');

  const phantom = useMemo(() => getPhantom(), []);

  const connect = async () => {
    if (!phantom) {
      setMessage('Phantom not found. Install it first.');
      return;
    }
    const res = await phantom.connect();
    setWallet(res.publicKey.toString());
  };

  const createPost = () => {
    setMessage(null);
    setPostUrl(null);
    startTransition(async () => {
      try {
        if (!wallet) throw new Error('Connect wallet first');
        const res = await fetch(`${apiBase}/api/moltbook/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, symbol, wallet, description, image, website, twitter, telegram })
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          setMessage(data.error || data.message || 'Post creation failed');
          return;
        }
        const id = String(data.post_id || '').trim();
        setPostId(id);
        setPostUrl(data.post_url || (id ? `https://www.moltbook.com/post/${id}` : null));
        setMessage(`Post created: ${data.post_id}`);
      } catch (err: any) {
        setMessage(err?.message || 'Post creation failed');
      }
    });
  };

  const launch = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        if (!phantom) throw new Error('Phantom not found');
        if (!wallet) throw new Error('Connect wallet first');
        if (!postId) throw new Error('Enter post_id');
        const mintKeypair = Keypair.generate();
        const payload: Record<string, any> = {
          post_id: postId,
          payer_public_key: wallet,
          mint_public_key: mintKeypair.publicKey.toBase58(),
          dev_buy_sol: Number(devBuy),
          post_url: postUrl || undefined,
          payload: {
            name,
            symbol,
            wallet,
            description,
            image,
            website: website || undefined,
            twitter: twitter || undefined,
            telegram: telegram || undefined
          }
        };

        const res = await fetch(`${apiBase}/api/launch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          setMessage(data.error || data.message || data.hint || 'Launch failed');
          return;
        }

        const sig = await sendSignedTx(data.tx_base64, mintKeypair, apiBase);
        await fetch(`${apiBase}/api/launch/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mint: data.mint, signature: sig })
        });

        setMessage(`Mint: ${data.mint} | Tx: ${sig}`);
        if (data.pumpfun_url) {
          window.open(data.pumpfun_url, '_blank');
        }
      } catch (err: any) {
        setMessage(err?.message || 'Launch failed');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="text-[11px] text-[var(--text-secondary)]">Step A — Create Moltbook post (agent publishes via API: {botName})</div>
        <pre className="bg-[var(--bg-dark)] rounded-md p-3 text-[11px] text-[var(--accent-teal)] overflow-x-auto">
{`!solclawnbot
\`\`\`json
${JSON.stringify(
  {
    name,
    symbol,
    wallet: wallet || 'YourSolanaWallet',
    description,
    image,
    ...(website ? { website } : {}),
    ...(twitter ? { twitter } : {}),
    ...(telegram ? { telegram } : {})
  },
  null,
  2
)}
\`\`\``}
        </pre>
        <div className="grid gap-2">
          <div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Token name</label>
            <input
              className="w-full rounded-md border border-[var(--border-dark-secondary)] bg-[var(--bg-dark)] px-3 py-2 text-xs text-white"
              placeholder="TEST"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Ticker (symbol)</label>
            <input
              className="w-full rounded-md border border-[var(--border-dark-secondary)] bg-[var(--bg-dark)] px-3 py-2 text-xs text-white"
              placeholder="TEST"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Description</label>
            <textarea
              className="w-full rounded-md border border-[var(--border-dark-secondary)] bg-[var(--bg-dark)] px-3 py-2 text-xs text-white"
              placeholder="First test deploy on Pump.fun"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Image URL (direct)</label>
            <input
              className="w-full rounded-md border border-[var(--border-dark-secondary)] bg-[var(--bg-dark)] px-3 py-2 text-xs text-white"
              placeholder="https://placehold.co/512x512.png"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Website (optional)</label>
            <input
              className="w-full rounded-md border border-[var(--border-dark-secondary)] bg-[var(--bg-dark)] px-3 py-2 text-xs text-white"
              placeholder="https://solclawn.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">X / Twitter (optional)</label>
            <input
              className="w-full rounded-md border border-[var(--border-dark-secondary)] bg-[var(--bg-dark)] px-3 py-2 text-xs text-white"
              placeholder="https://x.com/solclawn"
              value={twitter}
              onChange={(e) => setTwitter(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Telegram (optional)</label>
            <input
              className="w-full rounded-md border border-[var(--border-dark-secondary)] bg-[var(--bg-dark)] px-3 py-2 text-xs text-white"
              placeholder="https://t.me/yourgroup"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={connect} disabled={pending}>
              {wallet ? `Wallet: ${wallet.slice(0, 4)}...${wallet.slice(-4)}` : 'Connect Phantom'}
            </Button>
            <Button className="flex-1" disabled={!wallet || pending} onClick={createPost}>
              {pending ? 'Creating…' : 'Create post'}
            </Button>
          </div>
        </div>
        {postUrl && (
          <div className="text-[11px] text-[var(--text-secondary)] break-all">
            Post URL: <a className="text-[var(--accent-teal)]" href={postUrl} target="_blank" rel="noreferrer">{postUrl}</a>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-[11px] text-[var(--text-secondary)]">Step B — Launch</div>
        <div className="grid gap-2">
          <div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Moltbook post ID</label>
            <input
              className="w-full rounded-md border border-[var(--border-dark-secondary)] bg-[var(--bg-dark)] px-3 py-2 text-xs text-white"
              placeholder="Paste post ID"
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] text-[var(--text-secondary)] mb-1">Dev buy (SOL)</label>
            <input
              className="w-[140px] rounded-md border border-[var(--border-dark-secondary)] bg-[var(--bg-dark)] px-3 py-2 text-xs text-white"
              placeholder="0.1"
              value={devBuy}
              onChange={(e) => setDevBuy(e.target.value)}
            />
          </div>
        </div>
        <Button className="w-full" disabled={!postId || !wallet || pending} onClick={launch}>
          {pending ? 'Launching…' : 'Launch via Moltbook'}
        </Button>
      </div>

      {message && <div className="text-[11px] text-[var(--text-muted)] break-all">{message}</div>}
    </div>
  );
}
