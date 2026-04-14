import { useState } from 'react';
import { reservationService } from '../services/api';

const getErrorMessage = (err) => {
    const detail = err?.response?.data?.detail;

    if (Array.isArray(detail) && detail.length > 0) {
        return detail[0]?.msg || 'Please check your input fields.';
    }

    if (typeof detail === 'string' && detail.trim()) {
        return detail;
    }

    if (!err?.response) {
        return 'Unable to reach the server. Please try again.';
    }

    return 'Server error. Please try again later.';
};

export const useReservationModal = (ownerSlug, onSuccess, dates, getEditableTimeSlots) => {
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState({ day: '', time: '' });
    const [user, setUser] = useState({ name: '', email: '', phone_number: '' });
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');

    const handleInput = (e) => {
        const { name, value } = e.target;
        if (name === 'day') {
            const nextTimeSlots = getEditableTimeSlots(value);
            setModalData((prev) => ({
                ...prev,
                day: value,
                time: nextTimeSlots.includes(prev.time) ? prev.time : (nextTimeSlots[0] || ''),
            }));
        } else if (name === 'time') {
            setModalData((prev) => ({ ...prev, time: value }));
        } else {
            setUser((prev) => ({ ...prev, [name]: value }));
        }
        if (errors[name] || errors.general) {
            setErrors((prev) => ({ ...prev, [name]: null, general: null }));
        }
    };

    const showForm = (day, time) => {
        setSuccessMessage('');
        setUser({ name: '', email: '', phone_number: '' });
        setErrors({});
        setShowModal(true);
        setModalData({ day, time });
    };

    const handleConfirmReservation = async (e) => {
        e.preventDefault();
        try {
            const newReservation = { ...user, ...modalData };
            const createdReservation = await reservationService.create(ownerSlug, newReservation);
            onSuccess();
            setShowModal(false);
            setUser({ name: '', email: '', phone_number: '' });
            setErrors({});
            setSuccessMessage(
                createdReservation?.reservation_key
                    ? `Reservation confirmed. Your reservation key is ${createdReservation.reservation_key}.`
                    : 'Reservation confirmed successfully.'
            );
        } catch (err) {
            setSuccessMessage('');
            setErrors({ general: getErrorMessage(err) });
        }
    };

    return {
        showModal,
        setShowModal,
        modalData,
        user,
        errors,
        successMessage,
        setSuccessMessage,
        handleInput,
        handleConfirmReservation,
        showForm,
    };
};
