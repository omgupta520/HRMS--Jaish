import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../../api/endpoints';
import { errMsg } from '../../api/client';
import { Spinner } from '../../components/ui';
import AuthShell from './AuthShell';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgot({ email });
      setSent(true);
      toast.success('If that email exists, a reset link has been sent.');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Forgot password" subtitle="We'll email you a reset link">
      {sent ? (
        <div className="card text-center">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Check your inbox for a password reset link. In local development the link is printed in the backend console.
          </p>
          <Link to="/login" className="btn-primary mt-4 inline-flex">Back to login</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4 text-white" /> : 'Send reset link'}
          </button>
          <p className="text-center text-sm text-slate-500">
            <Link to="/login" className="font-medium text-brand-600 hover:underline">Back to login</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
