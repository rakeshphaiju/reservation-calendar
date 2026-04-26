import React from 'react';
import { isValidPhoneNumber } from 'react-phone-number-input';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

import Modal from './Modal';
import Input from './form/Input';
import Button from './form/Button';

interface ModalData {
    day: string;
    time: string;
}

interface ReservationUser {
    name: string;
    email: string;
    phone_number: string;
}

interface ReservationErrors {
    name?: string;
    email?: string;
    phone_number?: string;
    general?: string;
}

interface ReservationModalProps {
    show: boolean;
    close: () => void;
    modalData: ModalData;
    user: ReservationUser;
    errors: ReservationErrors;
    handleInput: (e: { target: { name: string; value: string } }) => void;
    handleConfirm: () => void;
    submitLabel?: string;
    heading?: string;
}

const formatDay = (day: string): string =>
    new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
    }).format(new Date(day));

const ReservationModal = ({
    show,
    close,
    modalData,
    user,
    errors,
    handleInput,
    handleConfirm,
    submitLabel = 'Reserve',
    heading = '',
}: ReservationModalProps) => {
    if (!show) return null;

    const handlePhoneChange = (value: string | undefined) => {
        handleInput({ target: { name: 'phone_number', value: value ?? '' } });
    };

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
                    {formatDay(modalData.day)}
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
                    <div className="text-red-500 text-sm mt-1 min-h-5">{errors.name}</div>
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
                    <div className="text-red-500 text-sm mt-1 min-h-5">{errors.email}</div>
                </div>

                <div>
                    <label className="block text-sm font-extrabold text-slate-700 mb-1">
                        Phone number
                    </label>
                    <PhoneInput
                        international
                        defaultCountry="FI"
                        value={user.phone_number}
                        onChange={handlePhoneChange}
                        className="flex items-center gap-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
                        numberInputProps={{
                            className:
                                'flex-1 min-w-0 outline-none bg-transparent text-sm text-slate-800 placeholder:text-slate-400',
                            placeholder: 'Enter phone number',
                        }}
                    />
                    <div className="text-red-500 text-sm mt-1 min-h-5">{errors.phone_number}</div>
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

export default ReservationModal;