import React from 'react';
import { useParams } from 'react-router-dom';

import Button from '../components/form/Button';
import ReservationModal from '../components/ReservationModal';
import { CalendarTable } from '../components/reservations/CalendarTable';
import { MobileCalendarView } from '../components/reservations/MobileCalendarView';
import { ReservationManager } from '../components/reservations/ReservationManager';
import { useReservation } from '../hooks/useReservation';
import { useWeekNavigation } from '../hooks/useWeekNavigation';
import { useReservationModal } from '../hooks/useReservationModal';

const Reserve = () => {
  const { ownerSlug } = useParams();

  // Custom hooks
  const {
    slotCapacity,
    maxWeeks,
    timeSlots,
    bookableDays,
    calendarExists,
    isFullyBooked,
    getSpotsLeft,
    refreshAvailability,
  } = useReservation(ownerSlug);

  const {
    dates,
    handlePreviousWeek,
    handleNextWeek,
    isPreviousWeekDisabled,
    isNextWeekDisabled,
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
  } = useReservationModal(ownerSlug, refreshAvailability, dates, timeSlots, (day) =>
    getEditableTimeSlots(day, timeSlots)
  );

  // Derived data
  const editableDays = dates.filter((day) =>
    timeSlots.some((time) => !isPastOrToday(day, time))
  );

  const slotProps = {
    isPastOrToday,
    isFullyBooked,
    getSpotsLeft: (day, time) => getSpotsLeft(day, time),
    showForm,
    slotCapacity,
  };

  if (!calendarExists) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-10 text-center text-amber-800">
        This reservation calendar is not available yet.
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

      <ReservationManager
        ownerSlug={ownerSlug}
        onReservationChange={refreshAvailability}
        editableDays={editableDays}
        getEditableTimeSlots={(day) => getEditableTimeSlots(day, timeSlots)}
        timeSlots={timeSlots}
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
          Reservation calendar
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handlePreviousWeek}
            disabled={isPreviousWeekDisabled}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-gray-700 disabled:opacity-10 disabled:cursor-not-allowed"
          >
            Previous Week
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
        times={timeSlots}
        slotProps={slotProps}
      />

      <CalendarTable
        dates={dates}
        times={timeSlots}
        slotProps={slotProps}
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
    </div>
  );
};

export default Reserve;
