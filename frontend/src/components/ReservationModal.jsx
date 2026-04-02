import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Modal from './Modal';
import Input from './form/Input';
import Button from './form/Button';


const ReservationModal = ({
    show,
    close,
    modalData,
    user,
    errors,
    handleInput,
    handleConfirm,
    submitLabel,
    heading,
}) => {
    if (!show) return null;

    return (
        <Modal show={show} close={close}>
            {heading && (
                <h3 className="mb-2 text-lg font-semibold text-slate-900">{heading}</h3>
            )}
            <p className="text-slate-600 mb-4">
                Reserve{' '}
                <span className="font-semibold text-slate-800">{modalData.time}</span>{' '}
                on{' '}
                <span className="font-semibold text-slate-800">
                    {moment(modalData.day).format('dddd, MMMM D')}
                </span>
                ?
            </p>

            <form className="space-y-2 text-left">
                <div>
                    <Input
                        title="Full Name"
                        name="name"
                        value={user.name}
                        placeholder="Enter your name"
                        handlechange={handleInput}
                        required
                    />
                    <div className="text-red-500 text-sm mt-1 min-h-[1.25rem]">{errors.name}</div>
                </div>

                <div>
                    <Input
                        title="Email"
                        name="email"
                        type="email"
                        value={user.email}
                        placeholder="Enter your email"
                        handlechange={handleInput}
                    />
                    <div className="text-red-500 text-sm mt-1 min-h-[1.25rem]">{errors.email}</div>
                </div>

                <div>
                    <Input
                        title="Phone number"
                        name="phone_number"
                        value={user.phone_number}
                        placeholder="Enter your phone number (10 digits)"
                        handlechange={handleInput}
                    />
                    <div className="text-red-500 text-sm mt-1 min-h-[1.25rem]">{errors.phone_number}</div>
                </div>

                {errors.general && (
                    <div className="rounded-md bg-red-50 p-3 mt-1 text-sm text-red-600 border border-red-200">
                        {errors.general}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <Button variant="secondary" onClick={close} className="flex-1 py-2.5">
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleConfirm} className="flex-1 py-2.5">
                        {submitLabel}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};


ReservationModal.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired,
    modalData: PropTypes.shape({
        day: PropTypes.string.isRequired,
        time: PropTypes.string.isRequired,
    }).isRequired,
    user: PropTypes.shape({
        name: PropTypes.string,
        email: PropTypes.string,
        phone_number: PropTypes.string,
    }).isRequired,
    errors: PropTypes.shape({
        name: PropTypes.string,
        email: PropTypes.string,
        phone_number: PropTypes.string,
        general: PropTypes.string,
    }).isRequired,
    handleInput: PropTypes.func.isRequired,
    handleConfirm: PropTypes.func.isRequired,
    submitLabel: PropTypes.string,
    heading: PropTypes.string,
};

ReservationModal.defaultProps = {
    submitLabel: 'Reserve',
    heading: '',
};

export default ReservationModal;
