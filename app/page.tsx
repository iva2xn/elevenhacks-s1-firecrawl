'use client';

import { useState } from 'react';

export default function Home() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    mappedLinks: string[];
    readmeUrl?: string;
    readmeContent?: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process repository');
      }

      setResult({
        mappedLinks: data.mappedLinks,
        readmeUrl: data.readmeUrl,
        readmeContent: data.readmeContent,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-white">Repository Mapper</h1>
          <p className="text-neutral-400">Map a repository and extract its context without deep scraping every file.</p>
        </header>

        <form onSubmit={handleSubmit} className="flex gap-4">
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/organization/repository"
            className="flex-1 px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-neutral-200"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Processing...' : 'Map Repo'}
          </button>
        </form>

        {error && (
          <div className="p-4 bg-red-900/50 border border-red-800 text-red-200 rounded-lg">
            {error}
          </div>
        )}

        {result && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b border-neutral-800 pb-2">Mapped Files ({result.mappedLinks.length})</h2>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 h-[500px] overflow-y-auto">
                <ul className="space-y-2 text-sm text-neutral-400">
                  {result.mappedLinks.map((link, i) => (
                    <li key={i} className="truncate hover:text-neutral-200 transition-colors">
                      <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
                    </li>
                  ))}
                  {result.mappedLinks.length === 0 && (
                    <li className="text-neutral-500 italic">No links found.</li>
                  )}
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold border-b border-neutral-800 pb-2">README Content</h2>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 h-[500px] overflow-y-auto">
                {result.readmeUrl && (
                  <p className="text-xs text-blue-400 mb-4 pb-2 border-b border-neutral-800 font-mono">
                    Source: {result.readmeUrl}
                  </p>
                )}
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-neutral-300">
                    {result.readmeContent}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
