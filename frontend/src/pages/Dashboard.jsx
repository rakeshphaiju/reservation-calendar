import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';

import { reservationService } from '../services/api';
import { authService } from '../services/authService';

import CalendarSetupCard from '../components/dashboard/CalendarSetupCard';
import CapacitySettings from '../components/dashboard/CapacitySettings';
import MaxWeeksSettings from '../components/dashboard/MaxWeeksSettings';
import BookableDaysSettings from '../components/dashboard/BookableDaysSettings';
import TimeSlotsSettings from '../components/dashboard/TimeSlotsSettings';
import CalendarDetailsSettings from '../components/dashboard/CalendarDetailsSettings';
import DashboardStats from '../components/dashboard/DashboardStats';
import DeleteAccountSection from '../components/dashboard/DeleteAccountSection';
import Footer from '../components/header/Footer';
import { sortTimeSlots } from '../utils/timeSlots';


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
const BOOKABLE_DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DEFAULT_DAY_TIME_SLOTS = BOOKABLE_DAY_OPTIONS.reduce((acc, day) => {
  acc[day] = [...DEFAULT_TIME_SLOTS];
  return acc;
}, {});

const EMPTY_FEEDBACK = { type: '', message: '' };

const normalizeDayTimeSlots = (dayTimeSlots, fallbackTimeSlots = DEFAULT_TIME_SLOTS) =>
  BOOKABLE_DAY_OPTIONS.reduce((acc, day) => {
    const nextSlots = dayTimeSlots?.[day]?.length ? dayTimeSlots[day] : fallbackTimeSlots;
    acc[day] = sortTimeSlots(nextSlots);
    return acc;
  }, {});


const Dashboard = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [capacity, setCapacity] = useState('');
  const [maxWeeks, setMaxWeeks] = useState('');
  const [dayTimeSlotsText, setDayTimeSlotsText] = useState(
    BOOKABLE_DAY_OPTIONS.reduce((acc, day) => ({ ...acc, [day]: DEFAULT_TIME_SLOTS.join('\n') }), {})
  );
  const [bookableDays, setBookableDays] = useState(DEFAULT_BOOKABLE_DAYS);
  const [calendarDescription, setCalendarDescription] = useState('');
  const [calendarLocation, setCalendarLocation] = useState('');
  const [savingCapacity, setSavingCapacity] = useState(false);
  const [savingMaxWeeks, setSavingMaxWeeks] = useState(false);
  const [savingTimeSlots, setSavingTimeSlots] = useState(false);
  const [savingBookableDays, setSavingBookableDays] = useState(false);
  const [savingCalendarDetails, setSavingCalendarDetails] = useState(false);
  const [creatingCalendar, setCreatingCalendar] = useState(false);
  const [makingCalendarPrivate, setMakingCalendarPrivate] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState({
    capacity: EMPTY_FEEDBACK,
    maxWeeks: EMPTY_FEEDBACK,
    timeSlots: EMPTY_FEEDBACK,
    bookableDays: EMPTY_FEEDBACK,
    calendarDetails: EMPTY_FEEDBACK,
  });
  const currentUser = authService.getUser();
  const navigate = useNavigate();


  const setFieldFeedback = (field, type, message) =>
    setFeedback((prev) => ({ ...prev, [field]: { type, message } }));

  const clearFieldFeedback = (field) =>
    setFeedback((prev) => ({ ...prev, [field]: EMPTY_FEEDBACK }));


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
      const normalizedDayTimeSlots = normalizeDayTimeSlots(
        timeSlotsResponse.day_time_slots,
        timeSlotsResponse.time_slots?.length ? timeSlotsResponse.time_slots : DEFAULT_TIME_SLOTS
      );
      setDayTimeSlotsText(
        BOOKABLE_DAY_OPTIONS.reduce((acc, day) => ({
          ...acc,
          [day]: normalizedDayTimeSlots[day].join('\n'),
        }), {})
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


  const handleCapacitySave = async () => {
    const nextCapacity = Number(capacity);
    if (!Number.isInteger(nextCapacity) || nextCapacity < 1 || nextCapacity > 100) {
      setFieldFeedback('capacity', 'error', 'Capacity must be a whole number between 1 and 100.');
      return;
    }
    try {
      setSavingCapacity(true);
      const response = await reservationService.updateSlotCapacity(nextCapacity);
      authService.setUser({ ...currentUser, slot_capacity: response.slot_capacity });
      setCapacity(String(response.slot_capacity));
      setFieldFeedback('capacity', 'success', 'Slot capacity updated successfully.');
    } catch (error) {
      setFieldFeedback('capacity', 'error', error?.response?.data?.detail || 'Failed to update slot capacity.');
    } finally {
      setSavingCapacity(false);
    }
  };


  const handleMaxWeeksSave = async () => {
    const nextMaxWeeks = Number(maxWeeks);
    if (!Number.isInteger(nextMaxWeeks) || nextMaxWeeks < 1 || nextMaxWeeks > 52) {
      setFieldFeedback('maxWeeks', 'error', 'Booking window must be a whole number between 1 and 52 weeks.');
      return;
    }
    try {
      setSavingMaxWeeks(true);
      const response = await reservationService.updateMaxWeeks(nextMaxWeeks);
      authService.setUser({ ...currentUser, max_weeks: response.max_weeks });
      setMaxWeeks(String(response.max_weeks));
      setFieldFeedback('maxWeeks', 'success', 'Booking window updated successfully.');
    } catch (error) {
      setFieldFeedback('maxWeeks', 'error', error?.response?.data?.detail || 'Failed to update booking window.');
    } finally {
      setSavingMaxWeeks(false);
    }
  };


  const handleTimeSlotsSave = async () => {
    const nextDayTimeSlots = BOOKABLE_DAY_OPTIONS.reduce((acc, day) => {
      acc[day] = (dayTimeSlotsText[day] || '')
        .split('\n')
        .map((slot) => slot.trim().replace(/\s+/g, ''))
        .filter(Boolean);
      acc[day] = sortTimeSlots(acc[day]);
      return acc;
    }, {});

    const invalidDay = bookableDays.find((day) => !nextDayTimeSlots[day]?.length);
    if (invalidDay) {
      setFieldFeedback('timeSlots', 'error', `Add at least one time slot for ${invalidDay} before saving.`);
      return;
    }
    try {
      setSavingTimeSlots(true);
      const response = await reservationService.updateTimeSlots(nextDayTimeSlots);
      authService.setUser({
        ...currentUser,
        time_slots: response.time_slots,
        day_time_slots: response.day_time_slots,
      });
      setDayTimeSlotsText(
        BOOKABLE_DAY_OPTIONS.reduce((acc, day) => ({
          ...acc,
          [day]: (response.day_time_slots?.[day] || DEFAULT_DAY_TIME_SLOTS[day]).join('\n'),
        }), {})
      );
      setFieldFeedback('timeSlots', 'success', 'Time slots updated successfully.');
    } catch (error) {
      setFieldFeedback('timeSlots', 'error', error?.response?.data?.detail || 'Failed to update time slots.');
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
    setDayTimeSlotsText((current) => ({
      ...current,
      [day]: current[day] || DEFAULT_TIME_SLOTS.join('\n'),
    }));
    clearFieldFeedback('bookableDays');
  };


  const handleBookableDaysSave = async () => {
    if (!bookableDays.length) {
      setFieldFeedback('bookableDays', 'error', 'Choose at least one bookable day before saving.');
      return;
    }
    try {
      setSavingBookableDays(true);
      const response = await reservationService.updateBookableDays(bookableDays);
      authService.setUser({ ...currentUser, bookable_days: response.bookable_days });
      setBookableDays(response.bookable_days);
      setFieldFeedback('bookableDays', 'success', 'Bookable days updated successfully.');
    } catch (error) {
      setFieldFeedback('bookableDays', 'error', error?.response?.data?.detail || 'Failed to update bookable days.');
    } finally {
      setSavingBookableDays(false);
    }
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
      setFieldFeedback('calendarDetails', 'success', 'Calendar details updated successfully.');
    } catch (error) {
      setFieldFeedback('calendarDetails', 'error', error?.response?.data?.detail || 'Failed to update calendar details.');
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
      alert(error?.response?.data?.detail || 'Failed to delete account.');
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
    } catch (error) {
      alert(error?.response?.data?.detail || 'Failed to create calendar.');
    } finally {
      setCreatingCalendar(false);
    }
  };


  const handleMakeCalendarPrivate = async () => {
    if (!window.confirm('Set this calendar back to private? Guests will no longer be able to book through your public link.')) return;
    try {
      setMakingCalendarPrivate(true);
      const response = await reservationService.makeCalendarPrivate();
      authService.setUser({
        ...currentUser,
        calendar_created: response.calendar_created,
        calendar_url: response.calendar_url,
      });
    } catch (error) {
      alert(error?.response?.data?.detail || 'Failed to make calendar private.');
    } finally {
      setMakingCalendarPrivate(false);
    }
  };


  const handleCopyLink = () => {
    navigator.clipboard.writeText(
      `https://www.bookingnest.me/calendar/${currentUser.calendar_slug}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            Manage {currentUser?.service_name || 'your'} calendar
          </h2>
          {currentUser?.calendar_slug && currentUser?.calendar_created ? (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <p className="text-sm text-slate-600">
                Public booking link:{' '}
                <span className="font-semibold">
                  www.bookingnest.me/calendar/{currentUser.calendar_slug}
                </span>
              </p>
              <button
                onClick={handleCopyLink}
                title="Copy link"
                className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {copied ? (
                  <FontAwesomeIcon icon={faCheck} className="h-4 w-4 text-green-600" />
                ) : (
                  <FontAwesomeIcon icon={faCopy} className="h-4 w-4" />
                )}
              </button>
            </div>
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
            <CalendarSetupCard
              isPrivate={!currentUser?.calendar_created}
              onCreateCalendar={handleCreateCalendar}
              onMakePrivate={handleMakeCalendarPrivate}
              creating={creatingCalendar}
              makingPrivate={makingCalendarPrivate}
            />
            <CapacitySettings
              capacity={capacity}
              onChange={(e) => { setCapacity(e.target.value); clearFieldFeedback('capacity'); }}
              onSave={handleCapacitySave}
              saving={savingCapacity}
              feedback={feedback.capacity}
            />
            <MaxWeeksSettings
              maxWeeks={maxWeeks}
              onChange={(e) => { setMaxWeeks(e.target.value); clearFieldFeedback('maxWeeks'); }}
              onSave={handleMaxWeeksSave}
              saving={savingMaxWeeks}
              feedback={feedback.maxWeeks}
            />
            <BookableDaysSettings
              bookableDays={bookableDays}
              onToggle={handleBookableDayToggle}
              onSave={handleBookableDaysSave}
              saving={savingBookableDays}
              feedback={feedback.bookableDays}
            />
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            <CalendarDetailsSettings
              description={calendarDescription}
              location={calendarLocation}
              onDescriptionChange={(e) => { setCalendarDescription(e.target.value); clearFieldFeedback('calendarDetails'); }}
              onLocationChange={(e) => { setCalendarLocation(e.target.value); clearFieldFeedback('calendarDetails'); }}
              onSave={handleCalendarDetailsSave}
              saving={savingCalendarDetails}
              feedback={feedback.calendarDetails}
            />
            <TimeSlotsSettings
              bookableDays={bookableDays}
              dayTimeSlotsText={dayTimeSlotsText}
              onChange={(day, value) => {
                setDayTimeSlotsText((current) => ({ ...current, [day]: value }));
                clearFieldFeedback('timeSlots');
              }}
              onSave={handleTimeSlotsSave}
              saving={savingTimeSlots}
              feedback={feedback.timeSlots}
            />
          </div>

        </div>
      </section>

      <DeleteAccountSection onDelete={handleDeleteAccount} deleting={deletingAccount} />

      <DashboardStats
        total={stats.totalReservations}
        reservedSlots={stats.reservedSlots}
        upcoming={stats.upcomingReservations}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          to="/reservation-list"
          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          View all reservations
        </Link>
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;