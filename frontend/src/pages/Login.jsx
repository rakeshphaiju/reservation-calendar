import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import Button from '../components/form/Button';
import Input from '../components/form/Input';
import PasswordInput from '../components/form/PasswordInput';
import { authService } from '../services/auth';


export default function Login() {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullname, setFullname] = useState('');
  const [password, setPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
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
        const data = await authService.register(username, email, fullname, password);
        setSuccess(`Account created. Your booking link is /calendar/${data.calendar_slug}`);
        setMode('login');
      } else {
        await authService.login(username, password);
        navigate(from, { replace: true });
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        setError('Invalid username or password.');
      } else if (status === 409) {
        setError(err?.response?.data?.detail || 'That username or email is already taken.');
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
    setRetypePassword('');
  };

  return (
    <div className="max-w-md mx-auto mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-semibold text-slate-800 sm:text-2xl">
        {mode === 'login' ? 'Sign in' : 'Create account'}
      </h2>
      <p className="mb-6 text-sm text-slate-600">
        {mode === 'login'
          ? 'Sign in to manage your own reservation calendar.'
          : 'Create a user account and we will generate a unique calendar link for you.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
          <Input
            name="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder=""
          />
        </div>

        {mode === 'register' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
            <Input
              name="fullname"
              type="text"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              required
              placeholder=""
            />
          </div>
        )}

        {mode === 'register' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <Input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder=""
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <PasswordInput
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {mode === 'register' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Retype password</label>
            <PasswordInput
              name="retypePassword"
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