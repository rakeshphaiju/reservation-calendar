// components/ReservationManager.js
import React, { useState } from 'react';
import Button from './form/Button';
import Input from './form/Input';
import ReservationModal from './ReservationModal';
import { reservationService } from '../services/api';

export const ReservationManager = ({
    ownerSlug,
    onReservationChange,
    editableDays,
    getEditableTimeSlots,
    timeSlots
}) => {
    const [reservationKey, setReservationKey] = useState('');
    const [managedReservation, setManagedReservation] = useState(null);
    const [manageErrors, setManageErrors] = useState({});
    const [manageSuccess, setManageSuccess] = useState('');
    const [manageLoading, setManageLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState({ day: '', time: '' });
    const [user, setUser] = useState({ name: '', address: '', email: '', phone_number: '' });
    const [errors, setErrors] = useState({});
    const [modalMode, setModalMode] = useState('edit');

    const handleReservationKeyLookup = async () => {
        const trimmedKey = reservationKey.trim();
        if (!trimmedKey) {
            setManageErrors({ key: 'Enter your reservation key.' });
            setManageSuccess('');
            return;
        }

        try {
            setManageLoading(true);
            setManageErrors({});
            setManageSuccess('');
            const reservation = await reservationService.getByKey(trimmedKey);
            if (reservation.owner_slug !== ownerSlug) {
                setManagedReservation(null);
                setManageErrors({ key: 'This reservation key belongs to a different calendar.' });
                return;
            }
            setManagedReservation(reservation);
        } catch (err) {
            setManagedReservation(null);
            setManageErrors({
                key: err?.response?.data?.detail || 'We could not find a reservation for that key.',
            });
        } finally {
            setManageLoading(false);
        }
    };

    const handleOpenEditReservation = () => {
        if (!managedReservation) return;

        if (!editableDays.length) {
            setManageErrors({ key: 'There are no future slots available to move this reservation to.' });
            setManageSuccess('');
            return;
        }

        const reservationIsEditable = !isPastOrToday(managedReservation.day, managedReservation.time);
        const initialDay = reservationIsEditable ? managedReservation.day : editableDays[0];
        const initialTimeOptions = getEditableTimeSlots(initialDay);
        const initialTime = reservationIsEditable && initialDay === managedReservation.day
            ? managedReservation.time
            : (initialTimeOptions[0] || '');

        setUser({
            name: managedReservation.name,
            address: managedReservation.address,
            email: managedReservation.email,
            phone_number: managedReservation.phone_number,
        });
        setModalData({ day: initialDay, time: initialTime });
        setErrors({});
        setManageErrors({});
        setModalMode('edit');
        setShowModal(true);
    };

    const handleUpdateReservation = async (e) => {
        e.preventDefault();
        if (!managedReservation?.reservation_key) return;

        try {
            const payload = { ...user, ...modalData };
            const updatedReservation = await reservationService.updateByKey(
                managedReservation.reservation_key,
                payload
            );
            setManagedReservation(updatedReservation);
            setShowModal(false);
            setManageErrors({});
            setManageSuccess('Reservation updated successfully.');
            onReservationChange();
        } catch (err) {
            if (err.response?.status === 409) {
                setErrors({ general: err.response.data?.detail || 'This slot is already reserved.' });
            } else if (err.response?.status === 400) {
                setErrors({ general: err.response.data?.detail || 'Please check your input fields.' });
            } else {
                setErrors({ general: 'Server error. Please try again later.' });
            }
        }
    };

    const handleDeleteByKey = async () => {
        if (!managedReservation?.reservation_key) return;
        if (!window.confirm('Delete this reservation? This action cannot be undone.')) return;

        try {
            setManageLoading(true);
            await reservationService.deleteByKey(managedReservation.reservation_key);
            setManagedReservation(null);
            setReservationKey('');
            setManageErrors({});
            setManageSuccess('Reservation deleted successfully.');
            onReservationChange();
        } catch (err) {
            setManageErrors({
                key: err?.response?.data?.detail || 'Failed to delete reservation.',
            });
        } finally {
            setManageLoading(false);
        }
    };

    const isPastOrToday = (day, time) => {
        const startTime = time.split('-')[0];
        const slotStart = moment(`${day} ${startTime}`, 'YYYY-MM-DD HH:mm');
        return slotStart.isSameOrBefore(moment());
    };

    return (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="lg:max-w-2xl">
                    <h3 className="text-lg font-semibold text-slate-900">Modify or delete an existing reservation</h3>
                    <p className="mt-1 text-sm text-slate-600">
                        Enter the reservation key from your confirmation email to manage your booking.
                    </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                    <input
                        value={reservationKey}
                        onChange={(e) => setReservationKey(e.target.value)}
                        placeholder="Enter reservation key"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:min-w-[18rem]"
                    />
                    <Button onClick={handleReservationKeyLookup} disabled={manageLoading}>
                        {manageLoading ? 'Checking...' : 'Find reservation'}
                    </Button>
                </div>
            </div>

            {manageErrors.key && (
                <p className="mt-3 text-sm text-rose-600">{manageErrors.key}</p>
            )}
            {manageSuccess && (
                <p className="mt-3 text-sm text-emerald-700">{manageSuccess}</p>
            )}

            {managedReservation && (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                        <p><span className="font-semibold text-slate-900">Name:</span> {managedReservation.name}</p>
                        <p><span className="font-semibold text-slate-900">Email:</span> {managedReservation.email}</p>
                        <p><span className="font-semibold text-slate-900">Date:</span> {managedReservation.day}</p>
                        <p><span className="font-semibold text-slate-900">Time:</span> {managedReservation.time}</p>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <Button onClick={handleOpenEditReservation}>
                            Modify reservation
                        </Button>
                        <Button variant="danger" onClick={handleDeleteByKey} disabled={manageLoading}>
                            Delete reservation
                        </Button>
                    </div>
                </div>
            )}

            <ReservationModal
                show={showModal}
                close={() => setShowModal(false)}
                modalData={modalData}
                user={user}
                errors={errors}
                handleInput={(e) => {
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
                }}
                handleConfirm={handleUpdateReservation}
                submitLabel="Save changes"
                heading="Update reservation"
                allowSlotEdit={true}
                availableDays={editableDays}
                availableTimeSlots={getEditableTimeSlots(modalData.day)}
            />
        </section>
    );
};