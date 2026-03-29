import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reservationService } from '../services/api';
import { authService } from '../services/auth';
import ReservationList from '../components/dashboard/ReservationList';
import CalendarSetupCard from '../components/dashboard/CalendarSetupCard';
import CapacitySettings from '../components/dashboard/CapacitySettings';
import MaxWeeksSettings from '../components/dashboard/MaxWeeksSettings';
import BookableDaysSettings from '../components/dashboard/BookableDaysSettings';
import TimeSlotsSettings from '../components/dashboard/TimeSlotsSettings';
import CalendarDetailsSettings from '../components/dashboard/CalendarDetailsSettings';
import DashboardStats from '../components/dashboard/DashboardStats';
import DeleteAccountSection from '../components/dashboard/DeleteAccountSection';

const DEFAULT_TIME_SLOTS = [
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '13:00-14:00',
  '15:00-16:00',
  '16:00-17:00',
  '17:00-18:00',
];
const DEFAULT_BOOKABLE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const Dashboard = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [capacity, setCapacity] = useState('');
  const [maxWeeks, setMaxWeeks] = useState('');
  const [timeSlotsText, setTimeSlotsText] = useState('');
  const [bookableDays, setBookableDays] = useState(DEFAULT_BOOKABLE_DAYS);
  const [calendarDescription, setCalendarDescription] = useState('');
  const [calendarLocation, setCalendarLocation] = useState('');
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [savingMaxWeeks, setSavingMaxWeeks] = useState(false);
  const [savingTimeSlots, setSavingTimeSlots] = useState(false);
  const [savingBookableDays, setSavingBookableDays] = useState(false);
  const [savingCalendarDetails, setSavingCalendarDetails] = useState(false);
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
      const [
        reservationResponse,
        capacityResponse,
        maxWeeksResponse,
        timeSlotsResponse,
        bookableDaysResponse,
        calendarDetailsResponse,
      ] = await Promise.all([
        reservationService.getAll({ skip: 0, limit: 1000 }),
        reservationService.getSlotCapacity(),
        reservationService.getMaxWeeks(),
        reservationService.getTimeSlots(),
        reservationService.getBookableDays(),
        reservationService.getCalendarDetails(),
      ]);
      setReservations(reservationResponse.data);
      setCapacity(String(capacityResponse.slot_capacity));
      setMaxWeeks(String(maxWeeksResponse.max_weeks));
      setTimeSlotsText(
        (timeSlotsResponse.time_slots?.length
          ? timeSlotsResponse.time_slots
          : DEFAULT_TIME_SLOTS
        ).join('\n')
      );
      setBookableDays(
        bookableDaysResponse.bookable_days?.length
          ? bookableDaysResponse.bookable_days
          : DEFAULT_BOOKABLE_DAYS
      );
      setCalendarDescription(calendarDetailsResponse.calendar_description || '');
      setCalendarLocation(calendarDetailsResponse.calendar_location || '');
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
      setReservations((current) => current.filter((r) => r.id !== id));
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
      authService.setUser({ ...currentUser, slot_capacity: response.slot_capacity });
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
      authService.setUser({ ...currentUser, max_weeks: response.max_weeks });
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
      authService.setUser({ ...currentUser, time_slots: response.time_slots });
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
      const BOOKABLE_DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
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
      authService.setUser({ ...currentUser, bookable_days: response.bookable_days });
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

  const handleCalendarDescriptionChange = (e) => {
    setCalendarDescription(e.target.value);
    if (feedback.message) setFeedback({ type: '', message: '' });
  };

  const handleCalendarLocationChange = (e) => {
    setCalendarLocation(e.target.value);
    if (feedback.message) setFeedback({ type: '', message: '' });
  };

  const handleCalendarDetailsSave = async () => {
    try {
      setSavingCalendarDetails(true);
      const response = await reservationService.updateCalendarDetails(
        calendarDescription,
        calendarLocation
      );
      authService.setUser({
        ...currentUser,
        calendar_description: response.calendar_description,
        calendar_location: response.calendar_location,
      });
      setCalendarDescription(response.calendar_description || '');
      setCalendarLocation(response.calendar_location || '');
      setFeedback({ type: 'success', message: 'Details:  updated successfully.' });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error?.response?.data?.detail || 'Failed to update calendar details.',
      });
    } finally {
      setSavingCalendarDetails(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account and all reservations on this calendar? This cannot be undone.')) return;
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

        {/* Full-width header */}
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Owner Dashboard
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Manage {currentUser?.username}&apos;s calendar
          </h2>
          {currentUser?.calendar_slug && currentUser?.calendar_created ? (
            <p className="mt-3 text-sm text-slate-600">
              Public booking link:{' '}
              <span className="font-semibold">/calendar/{currentUser.calendar_slug}</span>
            </p>
          ) : (
            <p className="mt-3 text-sm text-amber-700">
              Your calendar is still private. Customize the settings below, then create it.
            </p>
          )}
        </div>

        {/* Two-column settings grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Left column */}
          <div className="flex flex-col gap-4">
            {!currentUser?.calendar_created && (
              <CalendarSetupCard
                onCreateCalendar={handleCreateCalendar}
                creating={creatingCalendar}
              />
            )}
            <CapacitySettings
              capacity={capacity}
              onChange={handleCapacityChange}
              onSave={handleCapacitySave}
              saving={savingCapacity}
            />
            <MaxWeeksSettings
              maxWeeks={maxWeeks}
              onChange={handleMaxWeeksChange}
              onSave={handleMaxWeeksSave}
              saving={savingMaxWeeks}
            />
            <BookableDaysSettings
              bookableDays={bookableDays}
              onToggle={handleBookableDayToggle}
              onSave={handleBookableDaysSave}
              saving={savingBookableDays}
            />
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            <CalendarDetailsSettings
              description={calendarDescription}
              location={calendarLocation}
              onDescriptionChange={handleCalendarDescriptionChange}
              onLocationChange={handleCalendarLocationChange}
              onSave={handleCalendarDetailsSave}
              saving={savingCalendarDetails}
            />
            <TimeSlotsSettings
              timeSlotsText={timeSlotsText}
              onChange={handleTimeSlotsChange}
              onSave={handleTimeSlotsSave}
              saving={savingTimeSlots}
            />
          </div>
        </div>

        {feedback.message && (
          <p className={`mt-4 text-sm ${feedback.type === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}>
            {feedback.message}
          </p>
        )}
      </section>

      <DeleteAccountSection onDelete={handleDeleteAccount} deleting={deletingAccount} />

      <DashboardStats
        total={stats.totalReservations}
        reservedSlots={stats.reservedSlots}
        upcoming={stats.upcomingReservations}
      />

      <ReservationList reservations={reservations} onDelete={handleDelete} />
    </div>
  );
};

export default Dashboard;
