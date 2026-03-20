import React from 'react';
import PropTypes from 'prop-types';

const Input = (props) => {
  const {
    name,
    title,
    inputtype,
    value,
    handlechange,
    placeholder,
    ...otherProps
  } = props;

  return (
    <div className="space-y-0.5">
      <label
        htmlFor={name}
        className="block text-sm font-medium text-slate-700 mb-0.5"
      >
        {title}
      </label>
      <input
        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-slate-800 placeholder-slate-400 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        id={name}
        name={name}
        type={inputtype || 'text'}
        value={value}
        onChange={handlechange}
        placeholder={placeholder}
        {...otherProps}
      />
    </div>
  );
};

Input.propTypes = {
  name: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  inputtype: PropTypes.string,
  value: PropTypes.string.isRequired,
  handlechange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

Input.defaultProps = {
  placeholder: '',
  inputtype: 'text',
};

export default Input;
