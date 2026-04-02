import { useState } from 'react';
import { reservationService } from '../services/api';

export const useReservationModal = (ownerSlug, onSuccess, dates, getEditableTimeSlots) => {
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState({ day: '', time: '' });
    const [user, setUser] = useState({ name: '', email: '', phone_number: '' });
    const [errors, setErrors] = useState({});

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
        setUser({ name: '', email: '', phone_number: '' });
        setErrors({});
        setShowModal(true);
        setModalData({ day, time });
    };

    const handleConfirmReservation = async (e) => {
        e.preventDefault();
        try {
            const newReservation = { ...user, ...modalData };
            await reservationService.create(ownerSlug, newReservation);
            onSuccess();
            setShowModal(false);
            setUser({ name: '', email: '', phone_number: '' });
        } catch (err) {
            if (err.response?.status === 409) {
                setErrors({ general: err.response.data?.detail || 'This slot is already reserved.' });
            } else if (err.response?.status === 400) {
                setErrors({ general: 'Please check your input fields.' });
            } else if (err.response?.status === 404) {
                setErrors({ general: 'This calendar does not exist anymore.' });
            } else {
                setErrors({ general: 'Server error. Please try again later.' });
            }
        }
    };

    return {
        showModal,
        setShowModal,
        modalData,
        user,
        errors,
        handleInput,
        handleConfirmReservation,
        showForm,
    };
};
