import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/form/Button';
import { reservationService } from '../services/api';
import { authService } from '../services/auth';

const DEFAULT_TIME_SLOTS = [
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '13:00-14:00',
  '15:00-16:00',
  '16:00-17:00',
  '17:00-18:00',
];

const ReservationList = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [capacity, setCapacity] = useState('');
  const [timeSlotsText, setTimeSlotsText] = useState('');
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [savingTimeSlots, setSavingTimeSlots] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const currentUser = authService.getUser();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [reservationResponse, capacityResponse, timeSlotsResponse] = await Promise.all([
        reservationService.getAll({ skip: 0, limit: 100 }),
        reservationService.getSlotCapacity(),
        reservationService.getTimeSlots(),
      ]);
      setReservations(reservationResponse.data);
      setCapacity(String(capacityResponse.slot_capacity));
      setTimeSlotsText((timeSlotsResponse.time_slots?.length ? timeSlotsResponse.time_slots : DEFAULT_TIME_SLOTS).join('\n'));
    } catch {
      alert('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const groupedReservations = useMemo(() => {
    return reservations.reduce((groups, reservation) => {
      const key = `${reservation.day} ${reservation.time}`;
      groups[key] = groups[key] || [];
      groups[key].push(reservation);
      return groups;
    }, {});
  }, [reservations]);

  const stats = useMemo(() => {
    const slotCount = Object.keys(groupedReservations).length;
    const upcoming = reservations.filter((reservation) => {
      const slotStart = new Date(`${reservation.day}T${reservation.time.split('-')[0]}:00`);
      return slotStart.getTime() >= Date.now();
    }).length;

    return {
      totalReservations: reservations.length,
      reservedSlots: slotCount,
      upcomingReservations: upcoming,
    };
  }, [groupedReservations, reservations]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reservation?')) return;

    try {
      await reservationService.delete(id);
      setReservations((current) => current.filter((reservation) => reservation.id !== id));
      setFeedback({ type: 'success', message: 'Reservation deleted.' });
    } catch {
      alert('Failed to delete reservation');
    }
  };

  const handleCapacitySave = async () => {
    const nextCapacity = Number(capacity);
    if (!Number.isInteger(nextCapacity) || nextCapacity < 1 || nextCapacity > 100) {
      setFeedback({ type: 'error', message: 'Capacity must be a whole number between 1 and 100.' });
      return;
    }

    try {
      setSavingCapacity(true);
      const response = await reservationService.updateSlotCapacity(nextCapacity);
      authService.setUser({
        ...currentUser,
        slot_capacity: response.slot_capacity,
      });
      setCapacity(String(response.slot_capacity));
      setFeedback({ type: 'success', message: 'Slot capacity updated successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.response?.data?.detail || 'Failed to update slot capacity.',
      });
    } finally {
      setSavingCapacity(false);
    }
  };

  const handleTimeSlotsSave = async () => {
    const nextTimeSlots = timeSlotsText
      .split('\n')
      .map((slot) => slot.trim())
      .filter(Boolean);

    if (!nextTimeSlots.length) {
      setFeedback({ type: 'error', message: 'Add at least one time slot before saving.' });
      return;
    }

    try {
      setSavingTimeSlots(true);
      const response = await reservationService.updateTimeSlots(nextTimeSlots);
      authService.setUser({
        ...currentUser,
        time_slots: response.time_slots,
      });
      setTimeSlotsText(response.time_slots.join('\n'));
      setFeedback({ type: 'success', message: 'Time slots updated successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.response?.data?.detail || 'Failed to update time slots.',
      });
    } finally {
      setSavingTimeSlots(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Delete your account and all reservations on this calendar? This cannot be undone.'
    );
    if (!confirmed) return;

    try {
      setDeletingAccount(true);
      await authService.deleteAccount();
      navigate('/login', { replace: true });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.response?.data?.detail || 'Failed to delete account.',
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading owner dashboard...</div>;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Owner Dashboard
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Manage {currentUser?.username}&apos;s calendar
            </h2>
            {currentUser?.calendar_slug && (
              <p className="mt-3 text-sm text-slate-600">
                Public booking link: <span className="font-semibold">/calendar/{currentUser.calendar_slug}</span>
              </p>
            )}
          </div>

          <div className="grid gap-4 lg:w-[34rem]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-sm font-semibold text-slate-800" htmlFor="slot-capacity">
              Slot capacity
            </label>
            <p className="mt-1 text-sm text-slate-500">
              Set how many reservations are allowed in each time slot.
            </p>
            <div className="mt-4 flex items-end gap-3">
              <input
                id="slot-capacity"
                name="slot-capacity"
                type="number"
                min="1"
                max="100"
                value={capacity}
                onChange={(e) => {
                  setCapacity(e.target.value);
                  if (feedback.message) setFeedback({ type: '', message: '' });
                }}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <Button onClick={handleCapacitySave} disabled={savingCapacity}>
                {savingCapacity ? 'Saving...' : 'Save'}
              </Button>
            </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="block text-sm font-semibold text-slate-800" htmlFor="time-slots">
                Bookable time slots
              </label>
              <p className="mt-1 text-sm text-slate-500">
                Add one time slot per line in <code>HH:MM-HH:MM</code> format.
              </p>
              <textarea
                id="time-slots"
                name="time-slots"
                rows={7}
                value={timeSlotsText}
                onChange={(e) => {
                  setTimeSlotsText(e.target.value);
                  if (feedback.message) setFeedback({ type: '', message: '' });
                }}
                className="mt-4 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="mt-4 flex justify-end">
                <Button onClick={handleTimeSlotsSave} disabled={savingTimeSlots}>
                  {savingTimeSlots ? 'Saving...' : 'Save time slots'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {feedback.message && (
          <p className={`mt-4 text-sm ${feedback.type === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}>
            {feedback.message}
          </p>
        )}
      </section>

      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-xl font-bold text-rose-900">Delete account</h3>
            <p className="mt-1 text-sm text-rose-700">
              This removes your calendar owner account and permanently deletes all reservations for this calendar.
            </p>
          </div>
          <Button
            variant="danger"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
            className="px-5 py-2.5"
          >
            {deletingAccount ? 'Deleting...' : 'Delete account'}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total reservations</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalReservations}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Reserved slots</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.reservedSlots}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Upcoming reservations</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.upcomingReservations}</p>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Reservation list</h3>
            <p className="mt-1 text-sm text-slate-500">
              Review upcoming bookings and remove reservations when plans change.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
            {reservations.length} booked
          </div>
        </div>

        <div className="space-y-4 md:hidden">
          {reservations.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-12 text-center text-slate-500">
              No reservations yet.
            </div>
          ) : (
            reservations.map((reservation) => (
              <article
                key={reservation.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="space-y-1 text-sm">
                  <p className="text-slate-800">
                    <span className="font-semibold">Full name:</span> {reservation.name}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-700">Address:</span>{' '}
                    {reservation.address}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-700">Email:</span>{' '}
                    {reservation.email}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-700">Phone:</span>{' '}
                    {reservation.phone_number}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-700">Date:</span>{' '}
                    {reservation.day}
                  </p>
                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-700">Time:</span>{' '}
                    {reservation.time}
                  </p>
                </div>
                <Button
                  variant="danger"
                  onClick={() => handleDelete(reservation.id)}
                  className="mt-4 w-full px-3 py-2"
                >
                  Delete
                </Button>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Full name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Address</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Phone number</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Time</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {reservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No reservations yet.
                  </td>
                </tr>
              ) : (
                reservations.map((reservation) => (
                  <tr
                    key={reservation.id}
                    className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-slate-800">{reservation.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{reservation.address}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{reservation.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{reservation.phone_number}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{reservation.day}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{reservation.time}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="danger"
                        onClick={() => handleDelete(reservation.id)}
                        className="px-3 py-1.5"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default ReservationList;
