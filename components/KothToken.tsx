"use client";
import { useState } from 'react';
import { OFFICIAL_KOTH_MINT, KOTH_PUMP_URL, KOTH_EXPLORER_URL } from '@/lib/king-token/identity';

export default function KothToken({ rewardsEnabled }: { rewardsEnabled: boolean }) {
 const [copyStatus, setCopyStatus] = useState('');
 async function copyAddress() {
  try { await navigator.clipboard.writeText(OFFICIAL_KOTH_MINT); setCopyStatus('CA copied'); }
  catch { setCopyStatus('Copy unavailable. Select the address below to copy it.'); }
 }
 return <section className="panel koth-token" aria-label="Official KOTH token">
  <div className="koth-token-heading"><strong className="green">$KOTH · official token</strong><span className="dim">{rewardsEnabled ? 'Rewards enabled' : 'Rewards awaiting verification'}</span></div>
  <p className="dim">One token for the King of the Hill competition. Verify this contract address before trading.</p>
  <code className="koth-ca">{OFFICIAL_KOTH_MINT}</code>
  <div className="koth-token-actions"><button type="button" className="btn small" onClick={copyAddress}>Copy CA</button><a className="btn ghost small" href={KOTH_PUMP_URL} target="_blank" rel="noopener noreferrer">View on Pump ↗</a><a className="btn ghost small" href={KOTH_EXPLORER_URL} target="_blank" rel="noopener noreferrer">Solscan ↗</a></div>
  <span role="status" className="dim">{copyStatus}</span>
 </section>;
}
