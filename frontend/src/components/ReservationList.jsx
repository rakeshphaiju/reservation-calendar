import React from 'react';
import PropTypes from 'prop-types';
import Button from './form/Button';

const ReservationList = ({ reservations, onDelete }) => (
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
              onClick={() => onDelete(reservation.id)}
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
                    onClick={() => onDelete(reservation.id)}
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
);

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
