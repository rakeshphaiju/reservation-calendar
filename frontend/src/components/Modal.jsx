import React from "react";

// import "./Modal.css";

const Modal = props => {
  let modalData = null;

  if (props.show) {
    modalData = (
      <div className="modal-wrapper">
        <div className="modal-body">
        <div className="modal-header">
          <h3>Enter ur info</h3>
          <span className="close-modal-btn" onClick={props.close}>
            ×
          </span>
        </div>

          <div>{props.children}</div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={props.close}>
            CLOSE
          </button>
        </div>
        </div>
      </div>
    );
  }

  return <React.Fragment>{modalData}</React.Fragment>;
};

export default Modal;