import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';

import Modal from './Modal';
import Select from './form/Select';
import Button from './form/Button';

const ReservationUpdateModal = ({
    show,
    close,
    modalData,
    errors,
    handleInput,
    handleConfirm,
    availableDays,
    availableTimeSlots,
}) => {
    if (!show) return null;

    return (
        <Modal show={show} close={close}>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Update reservation</h3>
            <p className="mb-4 text-slate-600">
                Move your reservation to{' '}
                <span className="font-semibold text-slate-800">{modalData.time}</span>{' '}
                on{' '}
                <span className="font-semibold text-slate-800">
                    {moment(modalData.day).format('dddd, MMMM D')}
                </span>
                .
            </p>

            <form className="space-y-2 text-left">
                <Select
                    title="Date"
                    name="day"
                    value={modalData.day}
                    options={availableDays.map((day) => ({
                        value: day,
                        label: moment(day).format('dddd, MMMM D'),
                    }))}
                    handlechange={handleInput}
                />

                <Select
                    title="Time"
                    name="time"
                    value={modalData.time}
                    options={availableTimeSlots}
                    handlechange={handleInput}
                />

                {errors.general && (
                    <div className="mt-1 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                        {errors.general}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
                    <Button variant="secondary" onClick={close} className="flex-1 py-2.5">
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleConfirm} className="flex-1 py-2.5">
                        Save changes
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

ReservationUpdateModal.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired,
    modalData: PropTypes.shape({
        day: PropTypes.string.isRequired,
        time: PropTypes.string.isRequired,
    }).isRequired,
    errors: PropTypes.shape({
        general: PropTypes.string,
    }).isRequired,
    handleInput: PropTypes.func.isRequired,
    handleConfirm: PropTypes.func.isRequired,
    availableDays: PropTypes.arrayOf(PropTypes.string).isRequired,
    availableTimeSlots: PropTypes.arrayOf(PropTypes.string).isRequired,
};

export default ReservationUpdateModal;
