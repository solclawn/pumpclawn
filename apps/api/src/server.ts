import dotenv from 'dotenv';
import path from 'path';
import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction
} from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '../../.env') });

type SplitRow = { wallet: string; bps: number };
type Proofs = {
  mint_tx?: string;
  router_init_tx?: string;
  last_claim?: string;
  last_distribute?: string;
};
type TokenRecord = {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  agent?: string;
  moltbook_url?: string;
  moltbook_post_id?: string;
  trade_url?: string;
  creator_wallet: string;
  fee_split: SplitRow[];
  router_pda?: string;
  pumpfun_url: string;
  proofs: Proofs;
  created_at: string;
  launched_at?: string;
  claimable: number;
  market_cap?: number;
  price_usd?: number;
  price_change_24h?: number;
  volume_24h?: number;
  status?: 'pending' | 'minted';
};

type PendingPost = {
  postId: string;
  postUrl?: string;
  agentName?: string;
  payload: {
    name: string;
    symbol: string;
    wallet: string;
    description: string;
    image: string;
    website?: string;
    twitter?: string;
    telegram?: string;
  };
  createdAt: number;
};

const cfg = {
  pumpApiKey: process.env.PUMPPORTAL_API_KEY ?? '',
  rpcUrl: process.env.RPC_URL ?? 'https://api.mainnet-beta.solana.com',
  claimWalletSecret: process.env.CLAIM_WALLET_SECRET ?? '',
  // PumpPortal expects priorityFee in SOL (not lamports).
  defaultPriorityFeeSol: Number(process.env.PRIORITY_FEE_SOL ?? '0.00005'),
  moltbookApiBase: process.env.MOLTBOOK_API_BASE ?? 'https://www.moltbook.com/api/v1',
  moltbookApiKey: process.env.MOLTBOOK_API_KEY ?? '',
  moltbookTrigger: process.env.MOLTBOOK_TRIGGER ?? '!solclawnbot',
  moltbookSubmolt: process.env.MOLTBOOK_SUBMOLT ?? 'solclawn',
  launchCooldownDays: Number(process.env.LAUNCH_COOLDOWN_DAYS ?? '7'),
  maxNameLen: Number(process.env.MAX_TOKEN_NAME_LEN ?? '50'),
  maxDescLen: Number(process.env.MAX_TOKEN_DESC_LEN ?? '500'),
  maxSymbolLen: Number(process.env.MAX_TOKEN_SYMBOL_LEN ?? '10'),
  platformWallet: process.env.PLATFORM_WALLET ?? '',
  defaultDevBuySol: Number(process.env.DEFAULT_DEV_BUY_SOL ?? '0.1')
};

if (!cfg.pumpApiKey) {
  console.warn('Missing PUMPPORTAL_API_KEY env; create/claim will fail.');
}
if (!cfg.claimWalletSecret) {
  console.warn('Missing CLAIM_WALLET_SECRET env; distribute will fail.');
}

const claimWallet = cfg.claimWalletSecret
  ? Keypair.fromSecretKey(bs58.decode(cfg.claimWalletSecret))
  : Keypair.generate();
const connection = new Connection(cfg.rpcUrl, 'confirmed');

const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
const tokensPath = path.join(dataDir, 'tokens.json');
const pendingPath = path.join(dataDir, 'pending-posts.json');
const tokens = new Map<string, TokenRecord>();
const pendingPosts = new Map<string, PendingPost>();

function loadTokens() {
  try {
    if (!fs.existsSync(tokensPath)) return;
    const raw = fs.readFileSync(tokensPath, 'utf-8');
    const parsed = JSON.parse(raw) as TokenRecord[];
    parsed.forEach((t) => tokens.set(t.mint, t));
  } catch (err) {
    console.warn('Failed to load tokens.json', err);
  }
}

function saveTokens() {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const arr = Array.from(tokens.values());
    fs.writeFileSync(tokensPath, JSON.stringify(arr, null, 2));
  } catch (err) {
    console.warn('Failed to save tokens.json', err);
  }
}

function loadPending() {
  try {
    if (!fs.existsSync(pendingPath)) return;
    const raw = fs.readFileSync(pendingPath, 'utf-8');
    const parsed = JSON.parse(raw) as PendingPost[];
    parsed.forEach((p) => pendingPosts.set(p.postId, p));
  } catch (err) {
    console.warn('Failed to load pending-posts.json', err);
  }
}

function savePending() {
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    const arr = Array.from(pendingPosts.values());
    fs.writeFileSync(pendingPath, JSON.stringify(arr, null, 2));
  } catch (err) {
    console.warn('Failed to save pending-posts.json', err);
  }
}

loadTokens();
loadPending();

const DESCRIPTION_SUFFIX = '\n\n{LAUNCHED WITH SOLCLAWN}';

const splitSchema = z
  .array(
    z.object({
      wallet: z.string(),
      bps: z.number().int().min(1)
    })
  )
  .nonempty()
  .refine((rows) => rows.reduce((sum, r) => sum + r.bps, 0) === 10_000, 'fee_split bps must sum to 10000');

async function uploadMetadata(params: {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  website?: string;
  twitter?: string;
  telegram?: string;
}) {
  const { name, symbol, description, imageUrl, website, twitter, telegram } = params;
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error(`Image fetch failed (${imgResp.status})`);
  const arrayBuffer = await imgResp.arrayBuffer();
  const blob = new Blob([arrayBuffer], { type: imgResp.headers.get('content-type') ?? 'application/octet-stream' });

  const form = new FormData();
  form.append('file', blob, 'image');
  form.append('name', name);
  form.append('symbol', symbol);
  form.append('description', description);
  form.append('showName', 'true');
  if (website) form.append('website', website);
  if (twitter) form.append('twitter', twitter);
  if (telegram) form.append('telegram', telegram);

  const res = await fetch('https://pump.fun/api/ipfs', { method: 'POST', body: form as any });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Metadata upload failed: ${res.status} ${txt}`);
  }
  const data = (await res.json()) as { metadataUri: string };
  if (!data.metadataUri) throw new Error('metadataUri missing from pump.fun response');
  return data.metadataUri;
}

async function fetchJson(url: string, options: RequestInit) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || (data && data.success === false)) {
    const msg = (data && (data.error || data.message)) || res.statusText;
    throw new Error(msg);
  }
  return data;
}

async function ensureSubmolt(name: string) {
  if (!cfg.moltbookApiKey) return;
  const body = {
    name,
    display_name: name,
    description: 'Solclawn launches on Solana via Pump.fun.'
  };
  const res = await fetch(`${cfg.moltbookApiBase}/submolts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.moltbookApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (res.ok) return;
  const data = await res.json().catch(() => ({}));
  const msg = (data && (data.error || data.message)) || '';
  if (res.status === 409 || /already/i.test(msg)) return;
  throw new Error(msg || 'Failed to create submolt');
}

async function moltbookAgentStatus(apiKey: string) {
  return fetchJson(`${cfg.moltbookApiBase}/agents/status`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
}

async function moltbookAgentMe(apiKey: string) {
  return fetchJson(`${cfg.moltbookApiBase}/agents/me`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
}

async function moltbookGetPost(apiKey: string, postId: string) {
  return fetchJson(`${cfg.moltbookApiBase}/posts/${postId}`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
}

function normalizePostResponse(data: any) {
  if (data?.post) return data.post;
  if (data?.data?.post) return data.data.post;
  if (data?.data) return data.data;
  return data;
}

function findTriggerIndex(content: string, trigger: string) {
  const re = new RegExp(`^\\s*${trigger.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\s*$`, 'm');
  const match = content.match(re);
  return match?.index ?? -1;
}

function extractJsonBlock(content: string, trigger: string) {
  const triggerIndex = findTriggerIndex(content, trigger);
  if (triggerIndex === -1) throw new Error(`Post must contain ${trigger} on its own line`);
  const slice = content.slice(triggerIndex);
  const re = /```json\\s*([\\s\\S]*?)\\s*```/m;
  const match = slice.match(re);
  if (!match) throw new Error('No valid JSON found. Wrap JSON in a ```json code block.');
  return match[1];
}

function ensureDirectImageUrl(image: string) {
  const directExt = /\.(png|jpg|jpeg|gif|webp|svg)$/i;
  const withoutQuery = image.split('?')[0];
  const ok =
    image.startsWith('ipfs://') ||
    image.includes('arweave.net') ||
    image.includes('iili.io') ||
    image.includes('i.imgur.com') ||
    image.includes('placehold.co') ||
    image.includes('via.placeholder.com') ||
    directExt.test(withoutQuery);
  if (!ok) throw new Error('Image must be a direct link to an image file');
}

function parseLaunchJson(rawJson: string) {
  let payload: any;
  try {
    payload = JSON.parse(rawJson);
  } catch {
    throw new Error('Invalid JSON found. Use double quotes and no trailing commas.');
  }
  const normalizeWebsite = (value: any) => {
    const v = String(value || '').trim();
    if (!v) return undefined;
    if (/^https?:\/\//i.test(v)) return v;
    return `https://${v.replace(/^\/+/, '')}`;
  };
  const normalizeTwitter = (value: any) => {
    const v = String(value || '').trim();
    if (!v) return undefined;
    if (/^https?:\/\//i.test(v)) return v;
    if (/^x\.com\/|^twitter\.com\//i.test(v)) return `https://${v}`;
    const handle = v.replace(/^@/, '').split('/')[0];
    return `https://x.com/${handle}`;
  };
  const normalizeTelegram = (value: any) => {
    const v = String(value || '').trim();
    if (!v) return undefined;
    if (/^https?:\/\//i.test(v)) return v;
    if (/^t\.me\//i.test(v)) return `https://${v}`;
    const handle = v.replace(/^@/, '').split('/')[0];
    return `https://t.me/${handle}`;
  };
  const name = String(payload.name || '').trim();
  const symbol = String(payload.symbol || '').trim();
  const wallet = String(payload.wallet || '').trim();
  const description = String(payload.description || '').trim();
  const image = String(payload.image || '').trim();
  const website = normalizeWebsite(payload.website);
  const twitter = normalizeTwitter(payload.twitter);
  const telegram = normalizeTelegram(payload.telegram);
  if (!name || name.length > cfg.maxNameLen) throw new Error('Token name is required (max 50 chars)');
  if (!symbol || symbol.length > cfg.maxSymbolLen || !/^[A-Z0-9]+$/.test(symbol)) {
    throw new Error('Symbol invalid (max 10 chars, A-Z 0-9)');
  }
  if (!description || description.length > cfg.maxDescLen) throw new Error('Description is required (max 500 chars)');
  if (!image) throw new Error('Token image URL is required');
  ensureDirectImageUrl(image);
  try {
    new PublicKey(wallet);
  } catch {
    throw new Error('Invalid Solana wallet address');
  }
  return { name, symbol, wallet, description, image, website, twitter, telegram };
}

function buildLaunchJson(input: {
  name: string;
  symbol: string;
  wallet: string;
  description: string;
  image: string;
  website?: string;
  twitter?: string;
  telegram?: string;
}) {
  const payload = {
    name: input.name,
    symbol: input.symbol,
    wallet: input.wallet,
    description: input.description,
    image: input.image,
    ...(input.website ? { website: input.website } : {}),
    ...(input.twitter ? { twitter: input.twitter } : {}),
    ...(input.telegram ? { telegram: input.telegram } : {})
  };
  return `${cfg.moltbookTrigger}\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``;
}

function getPendingPost(postId: string) {
  const item = pendingPosts.get(postId);
  if (!item) return null;
  const maxAgeMs = 24 * 60 * 60 * 1000;
  if (Date.now() - item.createdAt > maxAgeMs) {
    pendingPosts.delete(postId);
    savePending();
    return null;
  }
  return item;
}

function isSymbolUsed(symbol: string) {
  for (const token of tokens.values()) {
    if (token.symbol.toUpperCase() === symbol.toUpperCase()) return true;
  }
  return false;
}

function isPostUsed(postId: string) {
  for (const token of tokens.values()) {
    const minted = token.status === 'minted' || Boolean(token.proofs?.mint_tx);
    if (token.moltbook_post_id === postId && minted) return true;
  }
  return false;
}

function clearPendingByPostId(postId: string) {
  let changed = false;
  for (const [mint, token] of tokens.entries()) {
    const minted = token.status === 'minted' || Boolean(token.proofs?.mint_tx);
    if (token.moltbook_post_id === postId && !minted) {
      tokens.delete(mint);
      changed = true;
    }
  }
  if (changed) saveTokens();
}

function hasRecentLaunch(agent?: string) {
  if (!agent) return false;
  const cutoff = Date.now() - cfg.launchCooldownDays * 24 * 60 * 60 * 1000;
  for (const token of tokens.values()) {
    const minted = token.status === 'minted' || Boolean(token.proofs?.mint_tx);
    if (token.agent === agent && minted) {
      const t = new Date(token.launched_at ?? token.created_at).getTime();
      if (t > cutoff) return true;
    }
  }
  return false;
}

async function pumpCreateToken(input: {
  name: string;
  symbol: string;
  metadataUri: string;
  mint: Keypair;
  devBuySol?: number;
  priorityFeeSol?: number;
}) {
  const body = {
    action: 'create',
    tokenMetadata: {
      name: input.name,
      symbol: input.symbol,
      uri: input.metadataUri
    },
    mint: bs58.encode(input.mint.secretKey),
    denominatedInSol: 'true',
    amount: input.devBuySol ?? cfg.defaultDevBuySol,
    slippage: 10,
    priorityFee: input.priorityFeeSol ?? cfg.defaultPriorityFeeSol,
    pool: 'pump'
  };

  const res = await fetch(`https://pumpportal.fun/api/trade?api-key=${cfg.pumpApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`pump.fun create failed: ${data.error || res.statusText}`);
  }
  return data as { signature: string };
}

async function pumpCreateTokenLocal(input: {
  publicKey: string;
  mintPublicKey: string;
  tokenMetadata: { name: string; symbol: string; uri: string };
  devBuySol?: number;
  priorityFeeSol?: number;
}) {
  const body = {
    publicKey: input.publicKey,
    action: 'create',
    tokenMetadata: input.tokenMetadata,
    mint: input.mintPublicKey,
    denominatedInSol: 'true',
    amount: input.devBuySol ?? cfg.defaultDevBuySol,
    slippage: 10,
    priorityFee: input.priorityFeeSol ?? cfg.defaultPriorityFeeSol,
    pool: 'pump',
    isMayhemMode: 'false'
  };
  const res = await fetch('https://pumpportal.fun/api/trade-local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`pump.fun create-local failed: ${res.status} ${txt}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString('base64');
}

async function pumpCollectCreatorFee(mint: string, priorityFeeSol?: number) {
  const body = {
    action: 'collectCreatorFee',
    mint,
    priorityFee: priorityFeeSol ?? cfg.defaultPriorityFeeSol,
    pool: 'pump'
  };
  const res = await fetch(`https://pumpportal.fun/api/trade?api-key=${cfg.pumpApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`collectCreatorFee failed: ${data.error || res.statusText}`);
  }
  return data as { signature: string };
}

async function lamportsDeltaForWallet(sig: string, wallet: PublicKey) {
  const tx = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
  if (!tx || !tx.meta) return 0;
  const message = tx.transaction.message as any;
  const accountKeys = typeof message.getAccountKeys === 'function'
    ? message.getAccountKeys().staticAccountKeys
    : message.accountKeys;
  const idx = (accountKeys ?? []).findIndex((k: PublicKey) => k.equals(wallet));
  if (idx === -1) return 0;
  const pre = tx.meta.preBalances?.[idx] ?? 0;
  const post = tx.meta.postBalances?.[idx] ?? 0;
  const fee = tx.meta.fee ?? 0;
  return post + fee - pre; // account for fee paid by wallet
}

async function distributeDirectLamports(params: { amount: number; recipients: SplitRow[] }) {
  const { amount, recipients } = params;
  const instructions = recipients.map((r) =>
    SystemProgram.transfer({
      fromPubkey: claimWallet.publicKey,
      toPubkey: new PublicKey(r.wallet),
      lamports: Math.floor((amount * r.bps) / 10_000)
    })
  );
  const tx = new Transaction().add(...instructions);
  const sig = await sendAndConfirmTransaction(connection, tx, [claimWallet], {
    commitment: 'confirmed'
  });
  return sig;
}

const app = Fastify({ logger: true });
app.register(sensible as unknown as Parameters<typeof app.register>[0]);
app.register(cors, { origin: true });
app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024 } });

app.get('/api/health', async () => ({ ok: true, time: new Date().toISOString() }));

app.post('/api/moltbook/post', async (request, reply) => {
  if (!cfg.moltbookApiKey) return reply.badRequest('Missing Moltbook API key');
  const schema = z.object({
    name: z.string().min(1).max(cfg.maxNameLen),
    symbol: z.string().min(1).max(cfg.maxSymbolLen),
    wallet: z.string().min(1),
    description: z.string().min(1).max(cfg.maxDescLen),
    image: z.string().min(1),
    website: z.string().optional(),
    twitter: z.string().optional(),
    telegram: z.string().optional(),
    submolt: z.string().optional(),
    title: z.string().optional()
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) return reply.badRequest(parsed.error.message);

  try {
    const { name, symbol, wallet, description, image, website, twitter, telegram, submolt, title } = parsed.data;
    ensureDirectImageUrl(image);
    try {
      new PublicKey(wallet);
    } catch {
      return reply.badRequest('Invalid Solana wallet address');
    }
    await ensureSubmolt(submolt || cfg.moltbookSubmolt);
    const content = buildLaunchJson({ name, symbol, wallet, description, image, website, twitter, telegram });
    const body = {
      submolt: submolt || cfg.moltbookSubmolt,
      title: title || `Launching ${symbol}`,
      content
    };
    const res = await fetchJson(`${cfg.moltbookApiBase}/posts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.moltbookApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const post = normalizePostResponse(res);
    const agent = await moltbookAgentMe(cfg.moltbookApiKey).catch(() => null);
    const agentName = agent?.agent?.name || agent?.data?.agent?.name || agent?.name;
    const postId = post?.id || post?.post?.id || res?.post?.id || res?.data?.post?.id;
    let postUrl = post?.url || post?.post?.url || res?.post?.url || res?.data?.post?.url;
    if (postId && (!postUrl || postUrl.startsWith('/post'))) {
      postUrl = `https://www.moltbook.com/post/${postId}`;
    }
    if (postId) {
      pendingPosts.set(postId, {
        postId,
        postUrl,
        agentName,
        payload: { name, symbol, wallet, description, image, website, twitter, telegram },
        createdAt: Date.now()
      });
      savePending();
    }
    return { success: true, post_id: postId, post_url: postUrl, content };
  } catch (err: any) {
    const msg = err?.message || 'post create failed';
    request.log.error(err);
    return reply.badRequest(msg);
  }
});

app.post('/api/upload', async (request, reply) => {
  const contentType = request.headers['content-type'] || '';

  let buffer: Buffer | null = null;
  let filename = 'image';
  let mimetype = 'application/octet-stream';

  if (contentType.includes('application/json')) {
    const body = request.body as any;
    const image = body?.image as string | undefined;
    const name = body?.name as string | undefined;
    if (!image) return reply.badRequest('image is required');

    if (image.startsWith('http://') || image.startsWith('https://')) {
      const imgResp = await fetch(image);
      if (!imgResp.ok) return reply.badRequest('image URL fetch failed');
      const arr = await imgResp.arrayBuffer();
      buffer = Buffer.from(arr);
      mimetype = imgResp.headers.get('content-type') ?? mimetype;
      filename = name || 'image';
    } else if (image.startsWith('data:')) {
      const match = image.match(/^data:(.+);base64,(.+)$/);
      if (!match) return reply.badRequest('invalid data URI');
      mimetype = match[1];
      buffer = Buffer.from(match[2], 'base64');
      filename = name || 'image';
    } else {
      buffer = Buffer.from(image, 'base64');
      filename = name || 'image';
    }
  } else {
    const file = await (request as any).file?.();
    if (!file) return reply.badRequest('No file uploaded');
    const buf = await file.toBuffer();
    buffer = Buffer.from(buf);
    filename = file.filename || 'image';
    mimetype = file.mimetype || mimetype;
  }

  if (!buffer) return reply.badRequest('No image provided');

  const blob = new Blob([new Uint8Array(buffer)], { type: mimetype });
  const form = new FormData();
  form.append('file', blob, filename);
  form.append('name', 'Solclawn');
  form.append('symbol', 'SCLAWN');
  form.append('description', 'Uploaded via Solclawn');
  form.append('showName', 'true');

  const res = await fetch('https://pump.fun/api/ipfs', { method: 'POST', body: form as any });
  if (!res.ok) {
    const txt = await res.text();
    return reply.internalServerError(`Upload failed: ${res.status} ${txt}`);
  }
  const data = await res.json();
  return {
    success: true,
    url: data.imageUri ?? null,
    image_uri: data.imageUri ?? null,
    metadata_uri: data.metadataUri ?? null,
    hint: 'Use the url value in your !solclawnbot JSON as the image field'
  };
});

app.post('/api/launch', async (request, reply) => {
  const body = request.body as any;
  const hasMoltbook = (body?.moltbook_key || cfg.moltbookApiKey) && body?.post_id;

  if (hasMoltbook) {
    const schema = z.object({
      moltbook_key: z.string().optional(),
      post_id: z.string().min(1),
      dev_buy_sol: z.number().optional(),
      payer_public_key: z.string().min(1),
      mint_public_key: z.string().min(1),
      post_url: z.string().optional(),
      payload: z
        .object({
          name: z.string(),
          symbol: z.string(),
          wallet: z.string(),
          description: z.string(),
          image: z.string(),
          website: z.string().optional(),
          twitter: z.string().optional(),
          telegram: z.string().optional()
        })
        .optional()
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return reply.badRequest(parsed.error.message);

    const moltbook_key = parsed.data.moltbook_key || cfg.moltbookApiKey;
    if (!moltbook_key) return reply.badRequest('Missing Moltbook API key');
    const post_id = parsed.data.post_id.trim();
    const { dev_buy_sol, payer_public_key, mint_public_key, payload, post_url } = parsed.data;
    try {
      const status = await moltbookAgentStatus(moltbook_key);
      if (status.status !== 'claimed') return reply.badRequest('Agent must be claimed');

      const me = await moltbookAgentMe(moltbook_key);
      const agentName = me?.agent?.name || me?.data?.agent?.name || me?.name;

      if (hasRecentLaunch(agentName)) {
        return reply.badRequest(`Rate limit: 1 token per ${cfg.launchCooldownDays} days`);
      }
      if (isPostUsed(post_id)) return reply.badRequest('Post already used');
      clearPendingByPostId(post_id);

      const cached = getPendingPost(post_id);
      let parsedLaunch: {
        name: string;
        symbol: string;
        wallet: string;
        description: string;
        image: string;
        website?: string;
        twitter?: string;
        telegram?: string;
      };
      let postUrl: string | undefined;

      if (cached) {
        parsedLaunch = parseLaunchJson(JSON.stringify(cached.payload));
        postUrl = cached.postUrl;
      } else if (payload) {
        parsedLaunch = parseLaunchJson(JSON.stringify(payload));
        postUrl = post_url || `https://www.moltbook.com/post/${post_id}`;
      } else {
        const postRes = await moltbookGetPost(moltbook_key, post_id);
        const post = normalizePostResponse(postRes);
        if (!post?.content) return reply.badRequest('Post not found');

        const authorName = post?.author?.name || post?.author?.username;
        if (agentName && authorName && agentName !== authorName) {
          return reply.badRequest('Post must belong to you');
        }

        try {
          const rawJson = extractJsonBlock(String(post.content), cfg.moltbookTrigger);
          parsedLaunch = parseLaunchJson(rawJson);
        } catch (err: any) {
          if (payload) {
            parsedLaunch = payload;
          } else {
            throw err;
          }
        }
        postUrl = post?.url || `https://www.moltbook.com/post/${post_id}`;
      }
      if (isSymbolUsed(parsedLaunch.symbol)) return reply.badRequest('Ticker already launched');
      if (parsedLaunch.wallet !== payer_public_key) {
        return reply.badRequest('Payer wallet must match JSON wallet');
      }

      const description = `${parsedLaunch.description}${DESCRIPTION_SUFFIX}`;
      const metadataUri = await uploadMetadata({
        name: parsedLaunch.name,
        symbol: parsedLaunch.symbol,
        description,
        imageUrl: parsedLaunch.image,
        website: parsedLaunch.website,
        twitter: parsedLaunch.twitter,
        telegram: parsedLaunch.telegram
      });

      const record: TokenRecord = {
        mint: mint_public_key,
        name: parsedLaunch.name,
        symbol: parsedLaunch.symbol,
        description,
        image: parsedLaunch.image,
        website: parsedLaunch.website,
        twitter: parsedLaunch.twitter,
        telegram: parsedLaunch.telegram,
        agent: agentName,
        moltbook_post_id: post_id,
        moltbook_url: postUrl || `https://www.moltbook.com/post/${post_id}`,
        trade_url: `https://pump.fun/coin/${mint_public_key}`,
        creator_wallet: parsedLaunch.wallet,
        fee_split: [
          { wallet: parsedLaunch.wallet, bps: 8000 },
          { wallet: cfg.platformWallet || claimWallet.publicKey.toBase58(), bps: 2000 }
        ],
        router_pda: 'pending-router-pda',
        pumpfun_url: `https://pump.fun/coin/${mint_public_key}`,
        proofs: {},
        created_at: new Date().toISOString(),
        launched_at: new Date().toISOString(),
        claimable: 0,
        status: 'pending'
      };

      tokens.set(record.mint, record);
      saveTokens();
      if (cached) {
        pendingPosts.delete(post_id);
        savePending();
      }

      const txBase64 = await pumpCreateTokenLocal({
        publicKey: payer_public_key,
        mintPublicKey: mint_public_key,
        tokenMetadata: { name: parsedLaunch.name, symbol: parsedLaunch.symbol, uri: metadataUri },
        devBuySol: dev_buy_sol
      });

      return {
        success: true,
        agent: agentName,
        post_id,
        post_url: record.moltbook_url,
        mint: record.mint,
        pumpfun_url: record.pumpfun_url,
        tx_base64: txBase64,
        rewards: {
          agent_share: '80%',
          platform_share: '20%',
          agent_wallet: parsedLaunch.wallet,
          platform_wallet: cfg.platformWallet || claimWallet.publicKey.toBase58()
        }
      };
    } catch (err: any) {
      const msg = err?.message || 'launch failed';
      request.log.error(err);
      if (
        /JSON|Post|Ticker|Image|Symbol|wallet|Rate limit|claimed/i.test(msg)
      ) {
        return reply.badRequest(msg);
      }
      return reply.internalServerError(msg);
    }
  }

  return reply.badRequest('Invalid launch request');
});

app.get('/api/token/:mint', async (request, reply) => {
  const mint = (request.params as any).mint;
  const token = tokens.get(mint);
  if (!token) return reply.notFound('Unknown mint');
  return token;
});

app.get('/api/tokens', async () => Array.from(tokens.values()));

app.post('/api/launch/confirm', async (request, reply) => {
  const schema = z.object({
    mint: z.string().min(1),
    signature: z.string().min(1)
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) return reply.badRequest(parsed.error.message);
  const token = tokens.get(parsed.data.mint);
  if (!token) return reply.notFound('Unknown mint');
  token.proofs.mint_tx = parsed.data.signature;
  token.status = 'minted';
  saveTokens();
  return { success: true };
});

app.post('/api/tx/send', async (request, reply) => {
  const schema = z.object({
    signed_tx: z.string().min(1)
  });
  const parsed = schema.safeParse(request.body);
  if (!parsed.success) return reply.badRequest(parsed.error.message);

  try {
    const raw = Buffer.from(parsed.data.signed_tx, 'base64');
    const sig = await connection.sendRawTransaction(raw);
    await connection.confirmTransaction(sig, 'confirmed');
    return { success: true, signature: sig };
  } catch (err: any) {
    const msg = err?.message || 'Failed to submit transaction';
    request.log.error(err);
    return reply.badRequest(msg);
  }
});

app.get('/api/stats', async () => {
  const allTokens = Array.from(tokens.values()).map((t) => ({
    mint: t.mint,
    name: t.name,
    symbol: t.symbol,
    agent: t.agent ?? 'agent',
    launchedAt: t.launched_at ?? t.created_at,
    marketCap: t.market_cap ?? 0,
    priceUsd: t.price_usd ?? 0,
    priceChange24h: t.price_change_24h ?? 0,
    volume24h: t.volume_24h ?? 0,
    moltbookUrl: t.moltbook_url,
    tradeUrl: t.trade_url ?? t.pumpfun_url
  }));

  const totalMarketCap = allTokens.reduce((sum, t) => sum + (t.marketCap || 0), 0);
  const totalVolume24h = allTokens.reduce((sum, t) => sum + (t.volume24h || 0), 0);
  const topTokens = [...allTokens].sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0)).slice(0, 5);

  return {
    success: true,
    totalMarketCap,
    totalVolume24h,
    tokenCount: allTokens.length,
    updatedAt: new Date().toISOString(),
    agentFeesEarned: { usdValue: 0 },
    topTokens,
    allTokens
  };
});

app.post('/api/fees/claim', async (request, reply) => {
  const bodySchema = z.object({ mint: z.string(), priority_fee: z.number().optional() });
  const parsed = bodySchema.safeParse(request.body);
  if (!parsed.success) return reply.badRequest(parsed.error.message);
  const token = tokens.get(parsed.data.mint);
  if (!token) return reply.notFound('Unknown mint');

  try {
    const res = await pumpCollectCreatorFee(token.mint, parsed.data.priority_fee);
    const claimed = await lamportsDeltaForWallet(res.signature, claimWallet.publicKey);
  token.claimable = claimed;
  token.proofs.last_claim = res.signature;
  saveTokens();
    return { success: true, mint: token.mint, claim_signature: res.signature, claimed_amount_lamports: claimed };
  } catch (err: any) {
    request.log.error(err);
    return reply.internalServerError(err.message || 'claim failed');
  }
});

app.post('/api/fees/distribute', async (request, reply) => {
  const bodySchema = z.object({
    mint: z.string(),
    amount_lamports: z.number().optional()
  });
  const parsed = bodySchema.safeParse(request.body);
  if (!parsed.success) return reply.badRequest(parsed.error.message);
  const token = tokens.get(parsed.data.mint);
  if (!token) return reply.notFound('Unknown mint');

  const amount = parsed.data.amount_lamports ?? token.claimable;
  if (amount <= 0) return reply.badRequest('No claimable amount to distribute');

  try {
    const sig = await distributeDirectLamports({ amount, recipients: token.fee_split });
  token.claimable = 0;
  token.proofs.last_distribute = sig;
  saveTokens();
    const distribution = token.fee_split.map((r) => ({
      wallet: r.wallet,
      lamports: Math.floor((amount * r.bps) / 10_000).toString()
    }));
    return {
      success: true,
      mint: token.mint,
      router_pda: token.router_pda,
      distribution_signature: sig,
      distribution
    };
  } catch (err: any) {
    request.log.error(err);
    return reply.internalServerError(err.message || 'distribution failed');
  }
});

app.get('/api/fees/:mint', async (request, reply) => {
  const mint = (request.params as any).mint;
  const token = tokens.get(mint);
  if (!token) return reply.notFound('Unknown mint');
  return {
    mint,
    claimable_lamports: token.claimable ?? 0,
    last_claim: token.proofs.last_claim,
    last_distribute: token.proofs.last_distribute
  };
});

const port = Number(process.env.PORT || 4000);
app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`Solclawn API ready on :${port}`);
});
