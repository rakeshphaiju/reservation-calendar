import React from 'react';
import PropTypes from 'prop-types';


const Button = ({
    children,
    onClick,
    type = 'button',
    variant = 'primary',
    className = '',
    disabled = false,
    ...props
}) => {
    const baseStyles = 'rounded-lg text-sm font-medium transition-colors focus:outline-none';

    const variants = {
        primary: 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-[0.98]',
        secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
        danger: 'bg-red-600 text-white hover:bg-red-500 active:scale-[0.98]',
        disabled: 'cursor-not-allowed bg-slate-100 text-slate-400 border-slate-200',
    };

    const currentVariant = disabled ? variants.disabled : variants[variant];

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${baseStyles} ${currentVariant} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
};

Button.propTypes = {
    children: PropTypes.node.isRequired,
    onClick: PropTypes.func,
    type: PropTypes.oneOf(['button', 'submit', 'reset']),
    variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'disabled']),
    className: PropTypes.string,
    disabled: PropTypes.bool,
};

export default Button;
