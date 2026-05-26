'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Candidate } from '@/lib/types';

type Chat = { role: 'user' | 'assistant'; text: string };

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [refinement, setRefinement] = useState('');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [chips, setChips] = useState<string[]>([]);
  const [chat, setChat] = useState<Chat[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const hasResults = candidates.length > 0;

  const canSearch = useMemo(() => query.trim().length > 0 && !loading, [query, loading]);

  async function performSearch(refinementText?: string) {
    setLoading(true);
    const res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, conversationalRefinementText: refinementText, currentCandidates: candidates })
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok || data.error) {
      setErrorMessage(data.error ?? '搜尋服務暫時不可用，請稍後再試。');
      return;
    }

    setErrorMessage('');

    if (data.blocked) {
      setChat((prev) => [...prev, { role: 'assistant', text: '這個方向我不能協助喔，我們可以換成安全的選購需求。' }]);
      return;
    }

    setCandidates(data.candidates ?? []);
    setChips(data.refinementChips ?? []);
    if (data.assistantMessage) {
      setChat((prev) => [...prev, { role: 'assistant', text: data.assistantMessage }]);
    }
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    setChat([]);
    setErrorMessage('');
    await performSearch();
  }

  async function onRefine(text?: string) {
    const nextText = (text ?? refinement).trim();
    if (!nextText || loading) return;
    setChat((prev) => [...prev, { role: 'user', text: nextText }]);
    setRefinement('');
    await performSearch(nextText);
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-3xl font-bold">AI Shopping Search Agent V3</h1>
      <form onSubmit={onSearch} className="mb-6 flex gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="想找什麼？可以直接描述感覺與偏好" className="flex-1 rounded-xl border p-3" />
        <button disabled={!canSearch} className="rounded-xl bg-slate-900 px-4 py-3 text-white disabled:opacity-40">{loading ? '整理中...' : '開始'}</button>
      </form>

      {errorMessage && <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{errorMessage}</p>}

      <section className="grid gap-3">
        {candidates.map((item) => (
          <article key={item.id} className="rounded-xl border bg-white p-4">
            <h2 className="font-semibold">{item.title}</h2>
            <p className="text-sm text-slate-600">{item.snippet}</p>
            <p className="mt-1 text-xs text-slate-500">{item.price} · {item.source}</p>
          </article>
        ))}
      </section>

      {hasResults && (
        <section className="mt-8 rounded-2xl border bg-white p-5">
          <h3 className="text-xl font-semibold">想更精確找尋？</h3>
          <p className="mt-1 text-sm text-slate-600">可以直接問 AI，例如：有沒有更高級一點的？不要太塑膠感、有沒有更適合小空間的？</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button key={chip} onClick={() => onRefine(chip)} className="rounded-full border px-3 py-1 text-sm hover:bg-slate-100">{chip}</button>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            {chat.map((msg, i) => (
              <div key={`${msg.role}-${i}`} className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'ml-auto bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {msg.text}
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <input value={refinement} onChange={(e) => setRefinement(e.target.value)} placeholder="告訴 AI 你想調整的方向…" className="flex-1 rounded-xl border p-3" />
            <button onClick={() => onRefine()} className="rounded-xl bg-slate-900 px-4 py-3 text-white">調整</button>
          </div>
        </section>
      )}
    </main>
  );
}
