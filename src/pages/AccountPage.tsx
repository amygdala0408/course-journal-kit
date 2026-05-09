import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSupabase, isSyncConfigured } from '../utils/supabaseClient';
import { pullFromCloud, pushToCloud, subscribeSync } from '../utils/sync';

type SessionShape = { email: string | null } | null;

export default function AccountPage() {
  const sb = getSupabase();
  const [session, setSession] = useState<SessionShape>(null);
  const [email, setEmail] = useState('');
  const [submitState, setSubmitState] = useState<
    | { kind: 'idle' }
    | { kind: 'sending' }
    | { kind: 'sent' }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });
  const [syncLine, setSyncLine] = useState('Idle');

  useEffect(() => {
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => {
      setSession(data.session ? { email: data.session.user.email ?? null } : null);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(s ? { email: s.user.email ?? null } : null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [sb]);

  useEffect(() => {
    return subscribeSync((status) => {
      switch (status.kind) {
        case 'disabled':
          setSyncLine('Sync disabled (no Supabase env vars set).');
          break;
        case 'signed-out':
          setSyncLine('Signed out — local-only.');
          break;
        case 'idle':
          setSyncLine(
            status.lastSyncAt
              ? `Synced ${status.lastSyncAt.toLocaleTimeString()}`
              : 'Connected.',
          );
          break;
        case 'syncing':
          setSyncLine('Syncing…');
          break;
        case 'error':
          setSyncLine(`Sync error: ${status.message}`);
          break;
      }
    });
  }, []);

  if (!isSyncConfigured() || !sb) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="font-editorial text-4xl font-semibold text-ink dark:text-dark-ink leading-tight">
          Account
        </h1>
        <p className="text-ink-muted dark:text-dark-ink-muted mt-2 mb-8">
          Cross-device sync is optional and not currently configured.
        </p>
        <div className="border border-ink dark:border-dark-ink p-6 space-y-3 text-sm">
          <p className="text-ink dark:text-dark-ink">
            Course Journal Kit works fully offline using your browser's local
            storage. To enable cross-device sync and shareable URLs, configure
            Supabase:
          </p>
          <ol className="list-decimal pl-5 space-y-1 text-ink-muted dark:text-dark-ink-muted">
            <li>Create a free Supabase project.</li>
            <li>
              Open the SQL editor and paste{' '}
              <code className="font-mono">supabase/schema.sql</code> from the
              repo, then run it.
            </li>
            <li>
              Copy <code className="font-mono">.env.example</code> to{' '}
              <code className="font-mono">.env.local</code>.
            </li>
            <li>
              Set <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>.
            </li>
            <li>Restart <code className="font-mono">npm run dev</code>.</li>
          </ol>
        </div>
        <div className="mt-6">
          <Link to="/settings" className="text-sm font-mono text-ink-muted dark:text-dark-ink-muted hover:underline">
            ← Settings
          </Link>
        </div>
      </div>
    );
  }

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitState({ kind: 'sending' });
    try {
      const { error } = await sb.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin + '/account' },
      });
      if (error) throw error;
      setSubmitState({ kind: 'sent' });
    } catch (err) {
      setSubmitState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Could not send magic link.',
      });
    }
  };

  const handleSignOut = async () => {
    await sb.auth.signOut();
    setSession(null);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="font-editorial text-4xl font-semibold text-ink dark:text-dark-ink leading-tight">
        Account
      </h1>
      <p className="text-ink-muted dark:text-dark-ink-muted mt-2 mb-8">
        Optional cloud sync is configured for this build. Sign in to back up
        and sync across devices. Local data keeps working with or without sync.
      </p>

      <section className="border border-ink dark:border-dark-ink p-6 mb-6">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
          Sync status
        </h2>
        <p className="text-sm text-ink dark:text-dark-ink">{syncLine}</p>
        {session && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => void pullFromCloud()}
              className="px-3 py-1.5 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink font-mono text-xs uppercase tracking-wider hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface"
            >
              Pull from cloud
            </button>
            <button
              onClick={() => void pushToCloud()}
              className="px-3 py-1.5 border border-ink dark:border-dark-ink text-ink dark:text-dark-ink font-mono text-xs uppercase tracking-wider hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface"
            >
              Push to cloud
            </button>
          </div>
        )}
      </section>

      {session ? (
        <section className="border border-ink dark:border-dark-ink p-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
            Signed in
          </h2>
          <p className="text-ink dark:text-dark-ink">{session.email ?? 'Anonymous'}</p>
          <button
            onClick={() => void handleSignOut()}
            className="mt-4 px-4 py-2 border border-error text-error font-mono text-sm uppercase tracking-wider hover:bg-error hover:text-white"
          >
            Sign out
          </button>
        </section>
      ) : (
        <section className="border border-ink dark:border-dark-ink p-6">
          <h2 className="font-mono text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted mb-4">
            Sign in with email
          </h2>
          <form onSubmit={handleSendMagicLink} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full p-3 border border-ink dark:border-dark-ink bg-transparent text-ink dark:text-dark-ink"
            />
            <button
              type="submit"
              disabled={submitState.kind === 'sending'}
              className="px-4 py-2 border-2 border-ink dark:border-dark-ink text-ink dark:text-dark-ink font-mono text-sm uppercase tracking-wider hover:bg-ink hover:text-inverse-on-surface dark:hover:bg-dark-ink dark:hover:text-dark-surface disabled:opacity-50"
            >
              {submitState.kind === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
          {submitState.kind === 'sent' && (
            <p className="mt-3 font-mono text-xs text-ink dark:text-dark-ink">
              ✓ Check your email for the sign-in link.
            </p>
          )}
          {submitState.kind === 'error' && (
            <p className="mt-3 font-mono text-xs text-error">{submitState.message}</p>
          )}
        </section>
      )}

      <div className="mt-6">
        <Link to="/settings" className="text-sm font-mono text-ink-muted dark:text-dark-ink-muted hover:underline">
          ← Settings
        </Link>
      </div>
    </div>
  );
}
