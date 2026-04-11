// src/components/form/PasswordInput.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';

const EyeIcon = ({ open }) => (
    open ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
    ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.293-3.95M6.7 6.7A9.953 9.953 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.953 9.953 0 01-1.624 3.174M3 3l18 18" />
        </svg>
    )
);

EyeIcon.propTypes = {
    open: PropTypes.bool.isRequired,
};

const PasswordInput = ({ name, title, value, onChange, placeholder, required }) => {
    const [visible, setVisible] = useState(false);

    return (
        <div className="space-y-0.5">
            <label htmlFor={name} className="block text-sm font-extrabold text-slate-700 mb-0.5">
                {title}
            </label>
            <div className="relative">
                <input
                    id={name}
                    name={name}
                    type={visible ? 'text' : 'password'}
                    value={value}
                    onChange={onChange}
                    required={required}
                    placeholder={placeholder}
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1 pr-10 text-slate-800 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    tabIndex={-1}
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                    <EyeIcon open={visible} />
                </button>
            </div>
        </div>
    );
};
PasswordInput.propTypes = {
    name: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    required: PropTypes.bool,
};

PasswordInput.defaultProps = {
    placeholder: '••••••••',
    required: false,
};

export default PasswordInput;