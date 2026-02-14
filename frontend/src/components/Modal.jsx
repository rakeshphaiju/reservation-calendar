import React from 'react';
import PropTypes from 'prop-types';

const Modal = (props) => {
  if (!props.show) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={props.close}
      onKeyDown={(e) => e.key === 'Escape' && props.close()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4 rounded-t-2xl">
          <h3 id="modal-title" className="text-lg font-semibold text-slate-800">
            Enter your info
          </h3>
          <button
            type="button"
            onClick={props.close}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <span className="text-2xl leading-none">&times;</span>
          </button>
        </div>
        <div className="px-6 py-6">{props.children}</div>
      </div>
    </div>
  );
};

Modal.propTypes = {
  show: PropTypes.bool.isRequired,
  close: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

export default Modal;
