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
    <div className="form-group">
      <label htmlFor={name} className="form-label">
        {title}
      </label>
      <input
        className="form-control"
        id={name}
        name={name}
        type={inputtype}
        value={value}
        onChange={handlechange} // Use handleChange here
        placeholder={placeholder}
        {...otherProps} // Spread any additional props
      />
    </div>
  );
};

// Define prop types for validation
Input.propTypes = {
  name: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  inputtype: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  handlechange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
};

// Default props
Input.defaultProps = {
  placeholder: '',
};

export default Input;
