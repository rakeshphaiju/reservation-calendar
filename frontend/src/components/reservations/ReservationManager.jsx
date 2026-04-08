import React, { useState } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';

import Button from '../form/Button';
import Input from '../form/Input';
import ReservationUpdateModal from '../ReservationUpdateModal';
import { reservationService } from '../../services/api';

export const ReservationManager = ({
    ownerSlug,
    onReservationChange,
    editableDays,
    getEditableTimeSlots
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [reservationKey, setReservationKey] = useState('');
    const [managedReservation, setManagedReservation] = useState(null);
    const [manageErrors, setManageErrors] = useState({});
    const [manageSuccess, setManageSuccess] = useState('');
    const [manageLoading, setManageLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState({ day: '', time: '' });
    const [errors, setErrors] = useState({});
    const [lookupEmail, setLookupEmail] = useState('');

    const handleReservationKeyLookup = async () => {
        const trimmedKey = reservationKey.trim();
        const trimmedEmail = lookupEmail.trim();

        if (!trimmedKey) {
            setManageErrors({ key: 'Enter your reservation key.' });
            setManageSuccess('');
            return;
        }

        if (!trimmedEmail) {
            setManageErrors({ key: 'Enter the email used when booking.' });
            setManageSuccess('');
            return;
        }

        try {
            setManageLoading(true);
            setManageErrors({});
            setManageSuccess('');
            const reservation = await reservationService.getByKey(trimmedKey, trimmedEmail);

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
        const initialTime =
            reservationIsEditable && initialDay === managedReservation.day
                ? managedReservation.time
                : (initialTimeOptions[0] || '');

        setModalData({ day: initialDay, time: initialTime });
        setErrors({});
        setManageErrors({});
        setShowModal(true);
    };

    const handleUpdateReservation = async (e) => {
        e.preventDefault();
        if (!managedReservation?.reservation_key) return;

        try {
            const updatedReservation = await reservationService.updateByKey(
                managedReservation.reservation_key,
                managedReservation.email,
                modalData
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
            await reservationService.deleteByKey(
                managedReservation.reservation_key,
                managedReservation.email
            );
            setManagedReservation(null);
            setReservationKey('');
            setLookupEmail('');
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
        <section className="mb-8 mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                        Manage an existing reservation with {ownerSlug}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                        Use your reservation key and booking email to modify or delete a reservation.
                    </p>
                </div>

                <Button
                    onClick={() => setIsOpen((prev) => !prev)}
                    aria-expanded={isOpen}
                    aria-controls="manage-reservations-panel"
                    className="inline-flex items-center gap-2"
                >
                    Manage Reservations
                    <span
                        className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'
                            }`}
                        aria-hidden="true"
                    >
                        ▾
                    </span>
                </Button>
            </div>

            <div
                id="manage-reservations-panel"
                className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100 mt-5' : 'grid-rows-[0fr] opacity-0 mt-0'
                    }`}
            >
                <div className="overflow-hidden">
                    <div className="border-t border-slate-200 pt-5">
                        <div className="flex w-full flex-col gap-3 sm:flex-row">
                            <Input
                                value={reservationKey}
                                onChange={(e) => setReservationKey(e.target.value)}
                                placeholder="Enter reservation key"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:min-w-[18rem]"
                            />
                            <Input
                                value={lookupEmail}
                                onChange={(e) => setLookupEmail(e.target.value)}
                                placeholder="Enter your email"
                                type="email"
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:min-w-[18rem]"
                            />
                            <Button onClick={handleReservationKeyLookup} disabled={manageLoading}>
                                {manageLoading ? 'Checking...' : 'Find reservation'}
                            </Button>
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
                                    <p><span className="font-semibold text-slate-900">Phone:</span> {managedReservation.phone_number}</p>
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
                    </div>
                </div>
            </div>

            <ReservationUpdateModal
                show={showModal}
                close={() => setShowModal(false)}
                modalData={modalData}
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
                    }
                }}
                handleConfirm={handleUpdateReservation}
                availableDays={editableDays}
                availableTimeSlots={getEditableTimeSlots(modalData.day)}
            />
        </section>
    );
};

ReservationManager.propTypes = {
    ownerSlug: PropTypes.string.isRequired,
    onReservationChange: PropTypes.func.isRequired,
    editableDays: PropTypes.arrayOf(PropTypes.string).isRequired,
    getEditableTimeSlots: PropTypes.func.isRequired,
};

export default ReservationManager;