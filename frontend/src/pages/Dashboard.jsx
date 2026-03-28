import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/form/Button';
import Input from '../components/form/Input';
import Checkbox from '../components/form/Checkbox';
import ReservationList from '../components/ReservationList';
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
const BOOKABLE_DAY_OPTIONS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const DEFAULT_BOOKABLE_DAYS = BOOKABLE_DAY_OPTIONS.slice(0, 5);

const Dashboard = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [capacity, setCapacity] = useState('');
  const [maxWeeks, setMaxWeeks] = useState('');
  const [timeSlotsText, setTimeSlotsText] = useState('');
  const [bookableDays, setBookableDays] = useState(DEFAULT_BOOKABLE_DAYS);
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [savingMaxWeeks, setSavingMaxWeeks] = useState(false);
  const [savingTimeSlots, setSavingTimeSlots] = useState(false);
  const [savingBookableDays, setSavingBookableDays] = useState(false);
  const [creatingCalendar, setCreatingCalendar] = useState(false);
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
      const [reservationResponse, capacityResponse, maxWeeksResponse, timeSlotsResponse, bookableDaysResponse] = await Promise.all([
        reservationService.getAll({ skip: 0, limit: 100 }),
        reservationService.getSlotCapacity(),
        reservationService.getMaxWeeks(),
        reservationService.getTimeSlots(),
        reservationService.getBookableDays(),
      ]);
      setReservations(reservationResponse.data);
      setCapacity(String(capacityResponse.slot_capacity));
      setMaxWeeks(String(maxWeeksResponse.max_weeks));
      setTimeSlotsText((timeSlotsResponse.time_slots?.length ? timeSlotsResponse.time_slots : DEFAULT_TIME_SLOTS).join('\n'));
      setBookableDays(bookableDaysResponse.bookable_days?.length ? bookableDaysResponse.bookable_days : DEFAULT_BOOKABLE_DAYS);
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

  const handleCapacityChange = (e) => {
    setCapacity(e.target.value);
    if (feedback.message) setFeedback({ type: '', message: '' });
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

  const handleMaxWeeksChange = (e) => {
    setMaxWeeks(e.target.value);
    if (feedback.message) setFeedback({ type: '', message: '' });
  };

  const handleMaxWeeksSave = async () => {
    const nextMaxWeeks = Number(maxWeeks);
    if (!Number.isInteger(nextMaxWeeks) || nextMaxWeeks < 1 || nextMaxWeeks > 52) {
      setFeedback({ type: 'error', message: 'Booking window must be a whole number between 1 and 52 weeks.' });
      return;
    }

    try {
      setSavingMaxWeeks(true);
      const response = await reservationService.updateMaxWeeks(nextMaxWeeks);
      authService.setUser({
        ...currentUser,
        max_weeks: response.max_weeks,
      });
      setMaxWeeks(String(response.max_weeks));
      setFeedback({ type: 'success', message: 'Booking window updated successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.response?.data?.detail || 'Failed to update booking window.',
      });
    } finally {
      setSavingMaxWeeks(false);
    }
  };

  const handleTimeSlotsChange = (e) => {
    setTimeSlotsText(e.target.value);
    if (feedback.message) setFeedback({ type: '', message: '' });
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

  const handleBookableDayToggle = (day) => {
    setBookableDays((current) => {
      const next = current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day];
      return BOOKABLE_DAY_OPTIONS.filter((option) => next.includes(option));
    });
    if (feedback.message) setFeedback({ type: '', message: '' });
  };

  const handleBookableDaysSave = async () => {
    if (!bookableDays.length) {
      setFeedback({ type: 'error', message: 'Choose at least one bookable day before saving.' });
      return;
    }

    try {
      setSavingBookableDays(true);
      const response = await reservationService.updateBookableDays(bookableDays);
      authService.setUser({
        ...currentUser,
        bookable_days: response.bookable_days,
      });
      setBookableDays(response.bookable_days);
      setFeedback({ type: 'success', message: 'Bookable days updated successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.response?.data?.detail || 'Failed to update bookable days.',
      });
    } finally {
      setSavingBookableDays(false);
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

  const handleCreateCalendar = async () => {
    try {
      setCreatingCalendar(true);
      const response = await reservationService.createCalendar();
      authService.setUser({
        ...currentUser,
        calendar_created: response.calendar_created,
        calendar_url: response.calendar_url,
      });
      setFeedback({
        type: 'success',
        message: `Calendar created successfully. Your public booking link is ${response.calendar_url}.`,
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.response?.data?.detail || 'Failed to create calendar.',
      });
    } finally {
      setCreatingCalendar(false);
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
            {currentUser?.calendar_slug && currentUser?.calendar_created ? (
              <p className="mt-3 text-sm text-slate-600">
                Public booking link: <span className="font-semibold">/calendar/{currentUser.calendar_slug}</span>
              </p>
            ) : (
              <p className="mt-3 text-sm text-amber-700">
                Your calendar is still private. Customize the settings below, then create it from this dashboard.
              </p>
            )}
          </div>

          <div className="grid gap-4 lg:w-[34rem]">
            {!currentUser?.calendar_created && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="text-base font-semibold text-amber-900">Create your calendar</h3>
                <p className="mt-1 text-sm text-amber-800">
                  Registration creates your owner account only. Once your booking rules look right, publish the calendar here.
                </p>
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleCreateCalendar} disabled={creatingCalendar}>
                    {creatingCalendar ? 'Creating...' : 'Create calendar'}
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Input
                name="slot-capacity"
                title="Slot capacity"
                inputtype="number"
                value={capacity}
                handlechange={handleCapacityChange}
                placeholder="Enter capacity (1-100)"
              />
              <p className="mt-1 text-sm text-slate-500">
                Set how many reservations are allowed in each time slot.
              </p>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleCapacitySave} disabled={savingCapacity}>
                  {savingCapacity ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Input
                name="max-weeks"
                title="Booking window"
                inputtype="number"
                value={maxWeeks}
                handlechange={handleMaxWeeksChange}
                placeholder="Enter weeks (1-52)"
              />
              <p className="mt-1 text-sm text-slate-500">
                Set how many weeks ahead people can navigate and book.
              </p>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleMaxWeeksSave} disabled={savingMaxWeeks}>
                  {savingMaxWeeks ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <label className="block text-sm font-semibold text-slate-800">
                Bookable days
              </label>
              <p className="mt-1 text-sm text-slate-500">
                Choose which weekdays appear on this calendar.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {BOOKABLE_DAY_OPTIONS.map((day) => {
                  const checked = bookableDays.includes(day);
                  return (
                    <div
                      key={day}
                      className={`rounded-lg border p-3 transition ${checked
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 bg-white'
                        }`}
                    >
                      <Checkbox
                        label={day}
                        checked={checked}
                        onChange={() => handleBookableDayToggle(day)}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleBookableDaysSave} disabled={savingBookableDays}>
                  {savingBookableDays ? 'Saving...' : 'Save days'}
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
                onChange={handleTimeSlotsChange}
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

      <ReservationList reservations={reservations} onDelete={handleDelete} />
    </div>
  );
};

export default Dashboard;
