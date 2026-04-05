import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Button from '../components/form/Button';
import Input from '../components/form/Input';
import { authService } from '../services/authService';

const CODE_LENGTH = 6;

export default function VerifyEmail() {
    const navigate = useNavigate();
    const location = useLocation();
    const emailFromState = location.state?.email || '';

    const [email, setEmail] = useState(emailFromState);
    const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(
        location.state?.message ||
        (location.state?.unverified
            ? 'Your account needs verification. Enter the code sent to your email.'
            : '')
    );
    const [cooldown, setCooldown] = useState(0);

    const inputRefs = useRef([]);

    useEffect(() => {
        if (cooldown <= 0) return;
        const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(id);
    }, [cooldown]);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    const handleCodeChange = (index, value) => {
        const digit = value.replace(/\D/g, '').slice(-1);
        const next = [...code];
        next[index] = digit;
        setCode(next);
        setError('');
        if (digit && index < CODE_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleCodeKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
        const digits = text.split('');
        const next = [...code];
        digits.forEach((d, i) => {
            next[i] = d;
        });
        setCode(next);
        inputRefs.current[Math.min(digits.length, CODE_LENGTH - 1)]?.focus();
        e.preventDefault();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const fullCode = code.join('');
        if (fullCode.length < CODE_LENGTH) {
            setError('Please enter the full 6-digit code.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await authService.verifyEmail(email, fullCode);
            setSuccess('Email verified! Redirecting to sign in…');
            setTimeout(() => navigate('/login', { state: { verified: true } }), 1500);
        } catch (err) {
            const status = err?.response?.status;
            if (status === 422) {
                setError('Invalid or expired code. Request a new one below.');
                setCode(Array(CODE_LENGTH).fill(''));
                inputRefs.current[0]?.focus();
            } else {
                setError(err?.response?.data?.detail || 'Verification failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (cooldown > 0 || resending || !email) return;
        setResending(true);
        setError('');
        try {
            await authService.resendVerification(email);
            setSuccess('A new code has been sent to your inbox.');
            setCooldown(60);
        } catch (err) {
            const status = err?.response?.status;
            if (status === 429) {
                setError('Please wait before requesting a new code.');
                setCooldown(60);
            } else {
                setError(err?.response?.data?.detail || 'Failed to resend. Please try again.');
            }
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-xl font-semibold text-slate-800 sm:text-2xl">
                Check your email
            </h2>
            <p className="mb-6 text-sm text-slate-600">
                We sent a 6-digit code to{' '}
                <span className="font-medium text-slate-800">{email || 'your email'}</span>.
                Enter it below to activate your account.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
                {!emailFromState && (
                    <Input
                        name="email"
                        title="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder=""
                    />
                )}

                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                        Verification code
                    </label>
                    <div className="flex gap-2" onPaste={handlePaste}>
                        {code.map((digit, i) => (
                            <input
                                key={i}
                                ref={(el) => (inputRefs.current[i] = el)}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleCodeChange(i, e.target.value)}
                                onKeyDown={(e) => handleCodeKeyDown(i, e)}
                                className={[
                                    'h-12 w-12 rounded-lg border text-center text-xl font-bold',
                                    'text-slate-800 outline-none transition-all',
                                    digit ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-white',
                                    'focus:border-teal-500 focus:ring-2 focus:ring-teal-200',
                                ].join(' ')}
                                aria-label={`Digit ${i + 1}`}
                            />
                        ))}
                    </div>
                </div>

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

                <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || code.join('').length < CODE_LENGTH}
                >
                    {loading ? 'Verifying…' : 'Verify email'}
                </Button>
            </form>

            <div className="mt-4 text-center text-sm text-slate-500">
                <p>Didn&apos;t get the code?</p>
                <button
                    type="button"
                    onClick={handleResend}
                    disabled={cooldown > 0 || resending}
                    className={[
                        'font-medium underline-offset-2 hover:underline',
                        cooldown > 0 || resending
                            ? 'cursor-not-allowed text-slate-400'
                            : 'cursor-pointer text-teal-600',
                    ].join(' ')}
                >
                    {resending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
            </div>
        </div>
    );
}
