import React, { useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';

import Button from '../components/form/Button';
import Input from '../components/form/Input';
import PasswordInput from '../components/form/PasswordInput';
import { authService } from '../services/auth';


export default function Login() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState(() =>
    searchParams.get('register') === '1' ? 'register' : 'login'
  );
  const [email, setEmail] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'register' && password !== retypePassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        await authService.register(email.trim(), serviceName.trim(), password);
        setSuccess('Account created. Sign in and finish your setup in the dashboard to create your calendar.');
        setMode('login');
      } else {
        await authService.login(email.trim(), password, rememberMe);
        navigate(from, { replace: true });
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        setError('Invalid email or password.');
      } else if (status === 409) {
        setError(err?.response?.data?.detail || 'That email is already registered.');
      } else if (status === 422) {
        setError('Please check your input and try again.');
      } else if (status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err?.response?.data?.detail || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setSuccess('');
    setEmail('');
    setServiceName('');
    setPassword('');
    setRetypePassword('');
    setRememberMe(false);
  };

  return (
    <div className="max-w-md mx-auto mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-slate-800 sm:text-2xl">
        Welcome to BookingNest
      </h2>
      <p className="mb-6 text-sm text-slate-600">
        {mode === 'login'
          ? 'Please sign in to manage your calendar.'
          : 'Create a user account first, then customize settings from the dashboard before publishing your calendar.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <div>
            <Input
              name="serviceName"
              type="text"
              title="Service name"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              required
              placeholder=""
            />
          </div>
        )}

        <div>
          <Input
            name="email"
            type="email"
            title="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder=""
            autoComplete="email"
          />
        </div>

        <div>
          <PasswordInput
            name="password"
            title="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {mode === 'register' && (
          <div>
            <PasswordInput
              name="retypePassword"
              title="Retype password"
              value={retypePassword}
              onChange={(e) => {
                setRetypePassword(e.target.value);
                if (error === 'Passwords do not match.') setError('');
              }}
            />
            {retypePassword && password !== retypePassword && (
              <p className="mt-1 text-xs text-red-600">Passwords do not match</p>
            )}
            {retypePassword && password === retypePassword && (
              <p className="mt-1 text-xs text-emerald-600">Passwords match ✓</p>
            )}
          </div>
        )}

        {mode === 'login' && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Keep me logged in
          </label>
        )}

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>
      </form>

      <Button
        type="button"
        variant="ghost"
        onClick={switchMode}
        className="mt-4 w-full text-sm font-medium"
      >
        {mode === 'login'
          ? 'Need a new calendar? Create an account'
          : 'Already have an account? Sign in'}
      </Button>
    </div>
  );
}
