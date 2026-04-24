import React from 'react';
import { useParams } from 'react-router-dom';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLocationArrow, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

import Button from '../components/form/Button';
import ReservationModal from '../components/ReservationModal';
import PoweredByFooter from '../components/PoweredByFooter';
import CalendarNotFound from '../components/CalendarNotFound';
import { CalendarTable } from '../components/reservations/CalendarTable';
import { MobileCalendarView } from '../components/reservations/MobileCalendarView';
import { ReservationManager } from '../components/reservations/ReservationManager';
import ReservationCalendarSkeleton from '../components/reservations/ReservationCalendarSkeleton';
import { useReservation } from '../hooks/useReservation';
import { useWeekNavigation } from '../hooks/useWeekNavigation';
import { useReservationModal } from '../hooks/useReservationModal';
import { sortTimeSlots } from '../utils/timeSlots';

const Reserve = () => {
  const { ownerSlug } = useParams();

  // Custom hooks
  const {
    isLoading,
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
    successMessage,
    setSuccessMessage,
    handleInput,
    handleConfirmReservation,
    showForm,
  } = useReservationModal(ownerSlug, refreshAvailability, dates, (day) =>
    getEditableTimeSlots(day, dayTimeSlots)
  );

  const editableDays = dates.filter((day) =>
    getEditableTimeSlots(day, dayTimeSlots, bookableDays).length > 0
  );

  const getTimeSlotsForDay = (day) => {
    const weekday = moment(day).format('dddd');
    if (!bookableDays.includes(weekday)) {
      return [];
    }
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

  if (isLoading) {
    return <ReservationCalendarSkeleton />;
  }

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

      {successMessage && (
        <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p>{successMessage}</p>
          <button
            type="button"
            onClick={() => setSuccessMessage('')}
            className="shrink-0 font-semibold text-emerald-700 transition-colors hover:text-emerald-900"
            aria-label="Dismiss reservation confirmation"
          >
            Close
          </button>
        </div>
      )}

      {(calendarDescription || calendarLocation) && (
        <section className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-base font-semibold text-slate-900">Details: </h3>
          {calendarDescription && (
            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{calendarDescription}</p>
          )}
          {calendarLocation && (
            <p className="mt-3 text-sm text-slate-700">
              <span className="font-semibold">Location:</span> {calendarLocation}{' '}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(calendarLocation)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Google Maps"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
              >
                <FontAwesomeIcon icon={faLocationArrow} className="h-3.5 w-3.5" />
              </a>
            </p>
          )}
        </section>
      )}

      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-600">
          Click on an available spot to create a new reservation.
        </p>

        <div className="flex items-center justify-between sm:justify-end sm:space-x-2">
          <Button
            onClick={handleToday}
            disabled={isTodayDisabled}
            className="px-2 py-1 bg-slate-600 text-white rounded hover:bg-slate-700 disabled:opacity-10 disabled:cursor-not-allowed"
          >
            Today
          </Button>

          <div className="flex items-center space-x-1">
            <Button
              onClick={handlePreviousWeek}
              variant="ghost"
              disabled={isPreviousWeekDisabled}
              className="px-2 py-1 text-blue-950 rounded hover:bg-blue-300 disabled:opacity-10 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </Button>

            <p className="text-sm font-bold w-20 text-center">
              Week {moment(dates[0]).week()}
            </p>

            <Button
              onClick={handleNextWeek}
              variant="ghost"
              disabled={isNextWeekDisabled}
              className="px-2 py-1 text-blue-950 rounded hover:bg-blue-300 disabled:opacity-10 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faChevronRight} />
            </Button>
          </div>
        </div>
      </div>

      <MobileCalendarView
        dates={dates}
        times={sortedVisibleTimeSlots.length ? sortedVisibleTimeSlots : timeSlots}
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
        getEditableTimeSlots={(day) => getEditableTimeSlots(day, dayTimeSlots, bookableDays)}
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
