import React from 'react';
import { useParams } from 'react-router-dom';
import moment from 'moment';

import Button from '../components/form/Button';
import ReservationModal from '../components/ReservationModal';
import PoweredByFooter from '../components/PoweredByFooter';
import CalendarNotFound from '../components/CalendarNotFound';
import { CalendarTable } from '../components/reservations/CalendarTable';
import { MobileCalendarView } from '../components/reservations/MobileCalendarView';
import { ReservationManager } from '../components/reservations/ReservationManager';
import { useReservation } from '../hooks/useReservation';
import { useWeekNavigation } from '../hooks/useWeekNavigation';
import { useReservationModal } from '../hooks/useReservationModal';
import { sortTimeSlots } from '../utils/timeSlots';

const Reserve = () => {
  const { ownerSlug } = useParams();

  // Custom hooks
  const {
    slotCapacity,
    maxWeeks,
    timeSlots,
    dayTimeSlots,
    bookableDays,
    calendarDescription,
    calendarLocation,
    calendarExists,
    isFullyBooked,
    getSpotsLeft,
    refreshAvailability,
  } = useReservation(ownerSlug);

  const {
    dates,
    handlePreviousWeek,
    handleToday,
    handleNextWeek,
    isPreviousWeekDisabled,
    isNextWeekDisabled,
    isTodayDisabled,
    isPastOrToday,
    getEditableTimeSlots,
  } = useWeekNavigation(bookableDays, maxWeeks);

  const {
    showModal,
    setShowModal,
    modalData,
    user,
    errors,
    handleInput,
    handleConfirmReservation,
    showForm,
  } = useReservationModal(ownerSlug, refreshAvailability, dates, (day) =>
    getEditableTimeSlots(day, dayTimeSlots)
  );

  // Derived data
  const editableDays = dates.filter((day) =>
    getEditableTimeSlots(day, dayTimeSlots).length > 0
  );

  const getTimeSlotsForDay = (day) => {
    const weekday = moment(day).format('dddd');
    return dayTimeSlots?.[weekday] || [];
  };

  const visibleTimeSlots = dates.reduce((slots, day) => {
    getTimeSlotsForDay(day).forEach((time) => {
      if (!slots.includes(time)) {
        slots.push(time);
      }
    });
    return slots;
  }, []);

  const sortedVisibleTimeSlots = sortTimeSlots(visibleTimeSlots);

  const slotProps = {
    isPastOrToday,
    isFullyBooked,
    getSpotsLeft: (day, time) => getSpotsLeft(day, time),
    showForm,
    slotCapacity,
  };

  if (!calendarExists) {
    return (
      <CalendarNotFound ownerSlug={ownerSlug} />
    );
  }

  const formatSlugAsName = (slug) =>
    slug
      .replace(/-\d+$/, '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div>
      <h2 className="mb-3 text-center text-xl font-bold text-slate-800 sm:text-2xl">
        Reserve your spot on {formatSlugAsName(ownerSlug)}&apos;s calendar
      </h2>

      {(calendarDescription || calendarLocation) && (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-900">Details: </h3>
          {calendarDescription && (
            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{calendarDescription}</p>
          )}
          {calendarLocation && (
            <p className="mt-3 text-sm text-slate-700">
              <span className="font-semibold">Location:</span> {calendarLocation}
            </p>
          )}
        </section>
      )}

      <div className="flex justify-between items-center mb-6">
        <p className="text-xs text-slate-600">
          Click on an available spot to create a new reservation.
        </p>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handlePreviousWeek}
            disabled={isPreviousWeekDisabled}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-gray-700 disabled:opacity-10 disabled:cursor-not-allowed"
          >
            Previous Week
          </Button>
          <Button
            onClick={handleToday}
            disabled={isTodayDisabled}
            className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 disabled:opacity-10 disabled:cursor-not-allowed"
          >
            Today
          </Button>
          <Button
            onClick={handleNextWeek}
            disabled={isNextWeekDisabled}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-10 disabled:cursor-not-allowed"
          >
            Next Week
          </Button>
        </div>
      </div>

      <MobileCalendarView
        dates={dates}
        getTimesForDay={getTimeSlotsForDay}
        slotProps={slotProps}
      />

      <CalendarTable
        dates={dates}
        times={sortedVisibleTimeSlots.length ? sortedVisibleTimeSlots : timeSlots}
        getTimesForDay={getTimeSlotsForDay}
        slotProps={slotProps}
      />

      <ReservationManager
        ownerSlug={ownerSlug}
        onReservationChange={refreshAvailability}
        editableDays={editableDays}
        getEditableTimeSlots={(day) => getEditableTimeSlots(day, dayTimeSlots)}
      />

      <ReservationModal
        show={showModal}
        close={() => setShowModal(false)}
        modalData={modalData}
        user={user}
        errors={errors}
        handleInput={handleInput}
        handleConfirm={handleConfirmReservation}
        submitLabel="Reserve"
        heading=""
      />

      {/* Powered by Booking Nest footer */}
      <div className="mt-8">
        <PoweredByFooter />
      </div>
    </div>
  );
};

export default Reserve;
