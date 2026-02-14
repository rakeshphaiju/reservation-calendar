import React from 'react';
import PropTypes from 'prop-types';

const Select = (props) => {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={props.name}
        className="block text-sm font-medium text-slate-700"
      >
        {props.title}
      </label>
      <select
        id={props.name}
        name={props.name}
        value={props.value}
        onChange={props.handlechange}
        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <option value="" disabled>
          {props.placeholder}
        </option>
        {props.options.map((option) => {
          return (
            <option key={option} value={option} label={option}>
              {option}
            </option>
          );
        })}
      </select>
    </div>
  );
};

Select.propTypes = {
  name: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  handlechange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        value: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
      }),
    ])
  ).isRequired,
};

export default Select;
