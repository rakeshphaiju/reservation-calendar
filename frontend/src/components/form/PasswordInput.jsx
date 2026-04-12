// src/components/form/PasswordInput.jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

const EyeIcon = ({ open }) => (
    open ? (
        <FontAwesomeIcon icon={faEye} className="h-4 w-4" />
    ) : (
        <FontAwesomeIcon icon={faEyeSlash} className="h-4 w-4" />
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