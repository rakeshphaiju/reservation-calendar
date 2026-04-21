import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import Button from '../components/form/Button';
import Input from '../components/form/Input';
import PasswordInput from '../components/form/PasswordInput';
import { authService } from '../services/authService';

const CODE_LENGTH = 6;

export default function VerifyEmail() {
    const navigate = useNavigate();
    const location = useLocation();
    const emailFromState = location.state?.email || '';
    const flow = location.pathname === '/forgot-password' || location.state?.flow === 'password_reset'
        ? 'password_reset'
        : 'email_verification';
    const isPasswordReset = flow === 'password_reset';

    const [email, setEmail] = useState(emailFromState);
    const [code, setCode] = useState(Array(CODE_LENGTH).fill(''));
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(
        location.state?.message ||
        (isPasswordReset
            ? 'Enter your email to receive a reset code, then choose a new password.'
            : location.state?.unverified
                ? 'Your account needs verification. Enter the code sent to your email.'
                : '')
    );
    const [cooldown, setCooldown] = useState(0);
    const [codeSent, setCodeSent] = useState(Boolean(emailFromState && !isPasswordReset) || Boolean(location.state?.codeSent));

    const inputRefs = useRef([]);

    useEffect(() => {
        if (cooldown <= 0) return;
        const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(id);
    }, [cooldown]);

    useEffect(() => {
        if (isPasswordReset && !codeSent) return;
        inputRefs.current[0]?.focus();
    }, [codeSent, isPasswordReset]);

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
        setError('');
        inputRefs.current[Math.min(digits.length, CODE_LENGTH - 1)]?.focus();
        e.preventDefault();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isPasswordReset && !codeSent) {
            if (!email.trim()) {
                setError('Please enter your email address.');
                return;
            }

            setLoading(true);
            setError('');
            try {
                const response = await authService.forgotPassword(email.trim());
                setSuccess(response?.message || 'If that email exists, a password reset code has been sent.');
                setCodeSent(true);
                setCooldown(60);
            } catch (err) {
                const status = err?.response?.status;
                if (status === 429) {
                    setError('Please wait before requesting a new code.');
                    setCooldown(60);
                } else {
                    setError(err?.response?.data?.detail || 'Failed to send reset code. Please try again.');
                }
            } finally {
                setLoading(false);
            }
            return;
        }

        const fullCode = code.join('');
        if (fullCode.length < CODE_LENGTH) {
            setError('Please enter the full 6-digit code.');
            return;
        }

        if (isPasswordReset) {
            if (password.length < 8) {
                setError('Password must be at least 8 characters.');
                return;
            }
            if (password !== confirmPassword) {
                setError('Passwords do not match.');
                return;
            }
        }

        setLoading(true);
        setError('');
        try {
            if (isPasswordReset) {
                await authService.resetPassword(email.trim(), fullCode, password);
                setSuccess('Password reset successful. Redirecting to sign in…');
                setTimeout(() => navigate('/login', { state: { reset: true, email: email.trim() } }), 1500);
            } else {
                await authService.verifyEmail(email, fullCode);
                setSuccess('Email verified! Redirecting to sign in…');
                setTimeout(() => navigate('/login', { state: { verified: true } }), 1500);
            }
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
            if (isPasswordReset) {
                await authService.forgotPassword(email.trim());
            } else {
                await authService.resendVerification(email.trim());
            }
            setSuccess('A new code has been sent to your inbox.');
            setCodeSent(true);
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
                {isPasswordReset ? 'Reset your password' : 'Check your email'}
            </h2>
            <p className="mb-6 text-sm text-slate-600">
                {isPasswordReset ? (
                    codeSent ? (
                        <>
                            We sent a 6-digit reset code to{' '}
                            <span className="font-medium text-slate-800">{email || 'your email'}</span>.
                            Enter it below and choose a new password.
                        </>
                    ) : (
                        'Enter your email address and we will send you a 6-digit password reset code.'
                    )
                ) : (
                    <>
                        We sent a 6-digit code to{' '}
                        <span className="font-medium text-slate-800">{email || 'your email'}</span>.
                        Enter it below to activate your account.
                    </>
                )}
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
                {(!emailFromState || isPasswordReset) && (
                    <Input
                        name="email"
                        title="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder=""
                    />
                )}

                {(!isPasswordReset || codeSent) && (
                    <>
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

                        {isPasswordReset && (
                            <>
                                <PasswordInput
                                    name="password"
                                    title="New password"
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError('');
                                    }}
                                    required
                                />
                                <PasswordInput
                                    name="confirmPassword"
                                    title="Confirm new password"
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        setError('');
                                    }}
                                    required
                                />
                            </>
                        )}
                    </>
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

                <Button
                    type="submit"
                    className="w-full px-2 py-1"
                    variant='login'
                    disabled={
                        loading ||
                        (isPasswordReset
                            ? (!codeSent ? !email.trim() : code.join('').length < CODE_LENGTH)
                            : code.join('').length < CODE_LENGTH)
                    }
                >
                    {loading
                        ? (isPasswordReset ? (codeSent ? 'Resetting…' : 'Sending…') : 'Verifying…')
                        : (isPasswordReset ? (codeSent ? 'Reset password' : 'Send reset code') : 'Verify email')}
                </Button>
            </form>

            {(!isPasswordReset || codeSent) && (
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
            )}
        </div>
    );
}
