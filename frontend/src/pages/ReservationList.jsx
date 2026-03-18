import React, { useState, useEffect } from 'react';
import Button from '../components/form/Button';
import { reservationService } from '../services/api';
import { authService } from '../services/auth';

const ReservationList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = authService.getUser();

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const response = await reservationService.getAll();
      setUsers(response.data);
    } catch {
      alert('Failed to load reservations');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this reservation?')) return;

    try {
      await reservationService.delete(id);
      setUsers(users.filter(user => user.id !== id));
    } catch {
      alert('Failed to delete reservation');
    }
  };

  if (loading) return <div className="p-8 text-center">Loading reservations...</div>;

  return (
    <div className="w-full">
      <h2 className="mb-6 text-xl font-bold text-slate-800 sm:text-2xl">
        Reservation List
      </h2>
      {currentUser?.calendar_slug && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Public booking link: <span className="font-semibold">/calendar/{currentUser.calendar_slug}</span>
        </div>
      )}

      {/* Mobile View */}
      <div className="space-y-4 md:hidden">
        {users.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-12 text-center text-slate-500 shadow-sm">
            No reservations yet.
          </div>
        ) : (
          users.map((user) => (
            <article
              key={user.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="space-y-1 text-sm">
                <p className="text-slate-800">
                  <span className="font-semibold">Full name:</span> {user.name}
                </p>
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-700">Address:</span>{' '}
                  {user.address}
                </p>
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-700">Email:</span>{' '}
                  {user.email}
                </p>
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-700">Phone:</span>{' '}
                  {user.phone_number}
                </p>
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-700">Date:</span>{' '}
                  {user.day}
                </p>
                <p className="text-slate-600">
                  <span className="font-semibold text-slate-700">Time:</span>{' '}
                  {user.time}
                </p>
              </div>
              <Button
                variant="danger"
                onClick={() => handleDelete(user.id)}
                className="mt-4 w-full px-3 py-2"
              >
                Delete
              </Button>
            </article>
          ))
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Full name
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Address
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Email
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Phone number
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Date
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Time
              </th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  No reservations yet.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-slate-800">
                    {user.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {user.address}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {user.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {user.phone_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {user.day}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {user.time}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(user.id)}
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
    </div>
  );
};

export default ReservationList;
