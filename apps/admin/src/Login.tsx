import { useState, type FormEvent } from 'react';

import { errorMessage } from './api.ts';
import { useAuth } from './auth.tsx';

export function Login({ notice }: { notice?: string }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const message = error ?? notice;

  return (
    <div className="center">
      <form className="card login" onSubmit={onSubmit}>
        <div className="brand">
          Baltic <span>Challenges</span>
          <small>Admin</small>
        </div>
        {message && <p className={`banner ${error ? 'banner-error' : 'banner-info'}`}>{message}</p>}
        <label>
          Email
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button className="btn-primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
