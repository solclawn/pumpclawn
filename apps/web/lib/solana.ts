import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';

export const defaultRpc = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com';

export function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function uint8ArrayToBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function getPhantom() {
  if (typeof window === 'undefined') return null;
  const anyWindow = window as any;
  if (anyWindow.solana && anyWindow.solana.isPhantom) return anyWindow.solana;
  return null;
}

export async function sendSignedTx(txBase64: string, mintKeypair: any, apiBase?: string) {
  const phantom = getPhantom();
  if (!phantom) throw new Error('Phantom wallet not found');
  const tx = VersionedTransaction.deserialize(base64ToUint8Array(txBase64));
  tx.sign([mintKeypair]);
  const signed = await phantom.signTransaction(tx);
  const connection = new Connection(defaultRpc, 'confirmed');
  try {
    const sig = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(sig, 'confirmed');
    return sig;
  } catch (err: any) {
    if (!apiBase) throw err;
    const signedBase64 = uint8ArrayToBase64(signed.serialize());
    const res = await fetch(`${apiBase}/api/tx/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signed_tx: signedBase64 })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.signature) {
      throw new Error(data?.error || data?.message || 'Failed to submit transaction');
    }
    return data.signature as string;
  }
}

export function isValidSolanaAddress(addr: string) {
  try {
    new PublicKey(addr);
    return true;
  } catch {
    return false;
  }
}
