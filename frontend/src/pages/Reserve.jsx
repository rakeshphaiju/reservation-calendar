import React, { useEffect, useState } from 'react';
import moment from 'moment';
import { useParams } from 'react-router-dom';

import Button from '../components/form/Button';
import SlotButton from '../components/SlotButton';
import ReservationModal from '../components/ReservationModal';
import { reservationService } from '../services/api';

const DEFAULT_TIME_SLOTS = [
  '10:00-11:00',
  '11:00-12:00',
  '12:00-13:00',
  '13:00-14:00',
  '15:00-16:00',
  '16:00-17:00',
  '17:00-18:00',
];
const WEEKDAY_OPTIONS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
const DEFAULT_BOOKABLE_DAYS = WEEKDAY_OPTIONS.slice(0, 5);
const WEEKDAY_TO_ISO = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

const Reserve = () => {
  const { ownerSlug } = useParams();
  const [startDate, setStartDate] = useState(moment().startOf('isoWeek'));
  const [slotCounts, setSlotCounts] = useState({});
  const [fullyBookedSlots, setFullyBookedSlots] = useState([]);
  const [slotCapacity, setSlotCapacity] = useState(5);
  const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS);
  const [bookableDays, setBookableDays] = useState(DEFAULT_BOOKABLE_DAYS);
  const [user, setUser] = useState({ name: '', address: '', email: '', phone_number: '' });
  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ day: '', time: '' });
  const [calendarExists, setCalendarExists] = useState(true);
  const [reservationKey, setReservationKey] = useState('');
  const [managedReservation, setManagedReservation] = useState(null);
  const [manageErrors, setManageErrors] = useState({});
  const [manageSuccess, setManageSuccess] = useState('');
  const [manageLoading, setManageLoading] = useState(false);
  const [modalMode, setModalMode] = useState('create');

  const getUpcomingDates = () => (
    bookableDays.map((day) => startDate.clone().isoWeekday(WEEKDAY_TO_ISO[day]).format('YYYY-MM-DD'))
  );

  const loadAvailability = () => {
    reservationService
      .getSlots(ownerSlug)
      .then((availability) => {
        const counts = {};
        const fullyBooked = [];
        const nextCapacity = availability.slot_capacity ?? 5;
        const nextTimeSlots = availability.time_slots?.length ? availability.time_slots : DEFAULT_TIME_SLOTS;
        const nextBookableDays = availability.bookable_days?.length ? availability.bookable_days : DEFAULT_BOOKABLE_DAYS;
        availability.slots.forEach(({ day, time, count }) => {
          if (!counts[day]) counts[day] = {};
          counts[day][time] = count;
          if (count >= nextCapacity) fullyBooked.push({ day, time });
        });
        setSlotCapacity(nextCapacity);
        setTimeSlots(nextTimeSlots);
        setBookableDays(nextBookableDays);
        setSlotCounts(counts);
        setFullyBookedSlots(fullyBooked);
        setCalendarExists(true);
      })
      .catch((err) => {
        if (err?.response?.status === 404) {
          setCalendarExists(false);
          setSlotCapacity(5);
          setTimeSlots(DEFAULT_TIME_SLOTS);
          setBookableDays(DEFAULT_BOOKABLE_DAYS);
          setSlotCounts({});
          setFullyBookedSlots([]);
          return;
        }
        console.log('Failed to load reserved slots');
      });
  };

  useEffect(() => {
    setErrors({});
    setShowModal(false);
    loadAvailability();
  }, [ownerSlug]);

  const handlePreviousWeek = () => {
    const prevMonday = startDate.clone().subtract(1, 'week').isoWeekday(1);
    const prevLastBookableDay = prevMonday.clone().isoWeekday(
      Math.max(...bookableDays.map((day) => WEEKDAY_TO_ISO[day]))
    );
    if (prevLastBookableDay.isAfter(moment(), 'day')) {
      setStartDate(prevMonday);
    }
  };

  const handleNextWeek = () => {
    const maxDate = moment().add(4, 'weeks');
    const nextMonday = startDate.clone().add(1, 'week').isoWeekday(1);
    const nextFirstBookableDay = nextMonday.clone().isoWeekday(
      Math.min(...bookableDays.map((day) => WEEKDAY_TO_ISO[day]))
    );
    if (nextFirstBookableDay.isSameOrBefore(maxDate, 'day')) {
      setStartDate(nextMonday);
    }
  };

  const dates = getUpcomingDates();
  const times = timeSlots;

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
    setUser({ name: '', address: '', email: '', phone_number: '' });
    setErrors({});
    setModalMode('create');
    setShowModal(true);
    setModalData({ day, time });
  };

  const isFullyBooked = (day, time) =>
    fullyBookedSlots.some((s) => s.day === day && s.time === time);

  const getSlotCount = (day, time) => slotCounts?.[day]?.[time] ?? 0;

  const getSpotsLeft = (day, time) => {
    if (isFullyBooked(day, time)) return 0;
    return slotCapacity - getSlotCount(day, time);
  };

  const isPastOrToday = (day, time) => {
    const startTime = time.split('-')[0];
    const slotStart = moment(`${day} ${startTime}`, 'YYYY-MM-DD HH:mm');
    return slotStart.isSameOrBefore(moment());
  };

  const editableDays = dates.filter((day) => times.some((time) => !isPastOrToday(day, time)));

  const getEditableTimeSlots = (day) => times.filter((time) => !isPastOrToday(day, time));

  const handleConfirmReservation = async (e) => {
    e.preventDefault();
    try {
      const newReservation = { ...user, ...modalData };
      await reservationService.create(ownerSlug, newReservation);
      loadAvailability();
      setShowModal(false);
      setUser({ name: '', address: '', email: '', phone_number: '' });
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

  const handleManageKeyInput = (e) => {
    setReservationKey(e.target.value);
    if (manageErrors.key) setManageErrors((prev) => ({ ...prev, key: '' }));
    if (manageSuccess) setManageSuccess('');
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
      loadAvailability();
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
      loadAvailability();
    } catch (err) {
      setManageErrors({
        key: err?.response?.data?.detail || 'Failed to delete reservation.',
      });
    } finally {
      setManageLoading(false);
    }
  };

  const slotProps = { isPastOrToday, isFullyBooked, getSpotsLeft, showForm, slotCapacity };

  if (!calendarExists) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-10 text-center text-amber-800">
        This reservation calendar could not be found.
      </div>
    );
  }

  if (!calendarExists) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-10 text-center text-amber-800">
        This reservation calendar could not be found.
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-3 text-center text-xl font-bold text-slate-800 sm:text-2xl">
        Reserve time on {ownerSlug}&apos;s calendar
      </h2>
      <p className="mb-8 text-center text-sm text-slate-500">
        Share this direct link to let people book this calendar only.
      </p>

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
              onChange={handleManageKeyInput}
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
      </section>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
          Reservation calendar
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handlePreviousWeek}
            disabled={startDate.clone().subtract(1, 'week').isoWeekday(
              Math.max(...bookableDays.map((day) => WEEKDAY_TO_ISO[day]))
            ).isSameOrBefore(moment(), 'day')}
            className="px-3 py-1.5 bg-gray-600 text-gray-700 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            Previous Week
          </Button>
          <Button
            onClick={handleNextWeek}
            disabled={startDate.clone().add(1, 'week').isoWeekday(
              Math.min(...bookableDays.map((day) => WEEKDAY_TO_ISO[day]))
            ).isAfter(moment().add(4, 'weeks'), 'day')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Next Week
          </Button>
        </div>
      </div>

      <div className="space-y-5 md:hidden">
        {dates.map((day) => (
          <section key={day} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-base font-semibold text-slate-800">
              {moment(day).format('dddd, MMMM D')}
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {times.map((time) => (
                <SlotButton key={`${day}-${time}`} day={day} time={time} mobile {...slotProps} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
              {times.map((time, i) => (
                <th key={i} className="px-3 py-3 text-center text-sm font-semibold text-slate-700 whitespace-nowrap">
                  {time}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.map((day, index) => (
              <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 whitespace-nowrap">
                  {moment(day).format('dddd, MMMM D')}
                </th>
                {times.map((time) => (
                  <td
                    key={`${day}-${time}`}
                    className={`px-2 py-2 ${isFullyBooked(day, time) ? 'bg-red-50' : ''}`}
                  >
                    <SlotButton day={day} time={time} {...slotProps} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReservationModal
        show={showModal}
        close={() => setShowModal(false)}
        modalData={modalData}
        user={user}
        errors={errors}
        handleInput={handleInput}
        handleConfirm={modalMode === 'edit' ? handleUpdateReservation : handleConfirmReservation}
        submitLabel={modalMode === 'edit' ? 'Save changes' : 'Reserve'}
        heading={modalMode === 'edit' ? 'Update reservation' : ''}
        allowSlotEdit={modalMode === 'edit'}
        availableDays={modalMode === 'edit' ? editableDays : dates}
        availableTimeSlots={modalMode === 'edit' ? getEditableTimeSlots(modalData.day) : times}
      />
    </div>
  );
};

export default Reserve;
