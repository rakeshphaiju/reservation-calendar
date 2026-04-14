import React, { useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';

import Button from '../components/form/Button';
import Input from '../components/form/Input';
import PasswordInput from '../components/form/PasswordInput';
import Checkbox from '../components/form/Checkbox';

import { authService } from '../services/authService';

export default function Login() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
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
  const [success, setSuccess] = useState(() =>
    location.state?.verified ? 'Email verified successfully. You can sign in now.' : ''
  );

  const navigate = useNavigate();
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
        const trimmedEmail = email.trim();
        const trimmedServiceName = serviceName.trim();
        const data = await authService.register(trimmedEmail, trimmedServiceName, password);
        navigate('/verify-email', {
          state: {
            email: trimmedEmail,
            unverified: true,
            message: data?.message,
          },
        });
      } else {
        await authService.login(email.trim(), password, rememberMe);
        navigate(from, { replace: true });
      }
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      const trimmedEmail = email.trim();

      if (status === 401) {
        setError('Invalid email or password.');
      } else if (status === 403 && detail === 'Please verify your email before signing in.') {
        navigate('/verify-email', {
          state: {
            email: trimmedEmail,
            unverified: true,
            message: detail,
          },
        });
      } else if (status === 409) {
        if (detail === 'Service name already exists') {
          setError('That service name is already taken. Please choose a different service name.');
        } else {
          setError(detail || 'That email is already registered.');
        }
      } else if (status === 422) {
        setError('Please check your input and try again.');
      } else if (status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(detail || 'Login failed. Please try again.');
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
      <h2 className="mb-4 text-xl font-semibold text-slate-800 sm:text-xl">
        Welcome to BookingNest
      </h2>
      <p className="mb-6 text-sm text-slate-600">
        {mode === 'login'
          ? 'Please sign in to manage your booking calendar.'
          : 'Create a user account first, then customize settings from the dashboard before publishing your booking calendar.'}
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
            {serviceName && (
              <p className="mt-1.5 text-sm text-gray-500">
                Your booking page will be available at{" "}
                <span className="font-medium text-gray-700">
                  www.bookingnest.me/calendar/{serviceName.toLowerCase().trim().replace(/\s+/g, "-")}
                </span>
              </p>
            )}
            {!serviceName && (
              <p className="mt-1.5 text-sm text-gray-500">
                The service name will be used to create your booking URL, e.g.{" "}
                <span className="font-medium text-gray-700">www.bookingnest.me/calendar/john-fitness</span>
              </p>
            )}
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

        {
          mode === 'register' && (
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
          )
        }

        {
          mode === 'login' && (
            <Checkbox
              name="rememberMe"
              label="Keep me logged in"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
          )
        }

        {
          error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )
        }
        {
          success && (
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </div>
          )
        }

        <Button type="submit" variant='login' className="w-full h-10" disabled={loading}>
          <p className='text-sm'>{loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}</p>
        </Button>
      </form >

      <Button
        type="button"
        variant="ghost"
        onClick={switchMode}
        className="mt-4 w-full text-sm font-medium"
      >
        {mode === 'login'
          ? 'Need a new booking calendar? Create an account'
          : 'Already have an account? Sign in'}
      </Button>
    </div >
  );
}
