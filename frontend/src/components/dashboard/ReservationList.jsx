import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Button from '../form/Button';

const VIEW_OPTIONS = [
  { id: 'list', label: 'List view' },
  { id: 'calendar', label: 'Calendar view' },
];

const sortReservations = (left, right) => {
  const dayCompare = left.day.localeCompare(right.day);
  if (dayCompare !== 0) return dayCompare;
  return left.time.localeCompare(right.time);
};

const formatReservationDay = (day) => {
  const parsed = new Date(`${day}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return day;

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
};

const ReservationList = ({ reservations, onDelete }) => {
  const [viewMode, setViewMode] = useState('list');

  const sortedReservations = useMemo(
    () => [...reservations].sort(sortReservations),
    [reservations]
  );

  const reservationsByDay = useMemo(() => {
    const groups = {};

    sortedReservations.forEach((reservation) => {
      if (!groups[reservation.day]) {
        groups[reservation.day] = {};
      }

      if (!groups[reservation.day][reservation.time]) {
        groups[reservation.day][reservation.time] = [];
      }

      groups[reservation.day][reservation.time].push(reservation);
    });

    return Object.entries(groups).map(([day, times]) => ({
      day,
      timeGroups: Object.entries(times)
        .sort(([leftTime], [rightTime]) => leftTime.localeCompare(rightTime))
        .map(([time, items]) => ({
          time,
          items,
        })),
    }));
  }, [sortedReservations]);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Reservation list</h3>
          <p className="mt-1 text-sm text-slate-500">
            Review bookings in a table or grouped by day and time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
            {VIEW_OPTIONS.map((option) => {
              const active = viewMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setViewMode(option.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${active
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600">
            {reservations.length} booked
          </div>
        </div>
      </div>

      {reservations.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-12 text-center text-slate-500">
          No reservations yet.
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {reservationsByDay.map(({ day, timeGroups }) => (
            <article
              key={day}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="border-b border-slate-200 pb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">
                  {day}
                </p>
                <h4 className="mt-1 text-lg font-bold text-slate-900">
                  {formatReservationDay(day)}
                </h4>
              </div>

              <div className="mt-4 space-y-4">
                {timeGroups.map(({ time, items }) => (
                  <div
                    key={`${day}-${time}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{time}</p>
                        <p className="text-xs text-slate-500">
                          {items.length} reservation{items.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-3">
                      {items.map((reservation) => (
                        <div
                          key={reservation.id}
                          className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                        >
                          <div className="space-y-1 text-sm">
                            <p className="font-semibold text-slate-900">{reservation.name}</p>
                            <p className="text-slate-600">{reservation.address}</p>
                            <p className="text-slate-600">{reservation.email}</p>
                            <p className="text-slate-600">{reservation.phone_number}</p>
                          </div>
                          <Button
                            variant="danger"
                            onClick={() => onDelete(reservation.id)}
                            className="mt-3 w-full px-3 py-2"
                          >
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <>
          <div className="space-y-4 md:hidden">
            {sortedReservations.map((reservation) => (
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
                  onClick={() => onDelete(reservation.id)}
                  className="mt-4 w-full px-3 py-2"
                >
                  Delete
                </Button>
              </article>
            ))}
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
                {sortedReservations.map((reservation) => (
                  <tr
                    key={reservation.id}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50/60"
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
                        onClick={() => onDelete(reservation.id)}
                        className="px-3 py-1.5"
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
};

ReservationList.propTypes = {
  reservations: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    address: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    phone_number: PropTypes.string.isRequired,
    day: PropTypes.string.isRequired,
    time: PropTypes.string.isRequired,
  })).isRequired,
  onDelete: PropTypes.func.isRequired,
};

export default ReservationList;
