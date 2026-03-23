import React from 'react';
import PropTypes from 'prop-types';

const Checkbox = ({ name, label, checked, onChange, ...otherProps }) => {
    return (
        <label className="flex cursor-pointer items-center gap-2">
            <input
                type="checkbox"
                name={name}
                checked={checked}
                onChange={onChange}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                {...otherProps}
            />
            <span className="text-sm text-slate-700">{label}</span>
        </label>
    );
};

Checkbox.propTypes = {
    name: PropTypes.string,
    label: PropTypes.string.isRequired,
    checked: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
};

Checkbox.defaultProps = {
    name: '',
};

export default Checkbox;