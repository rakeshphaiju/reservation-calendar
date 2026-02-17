import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ReservationList = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    getUsers();
  }, []);

  const getUsers = async () => {
    try {
      const response = await fetch('/api/reserve');
      const text = await response.text();

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      if (!text) throw new Error('Empty response from server.');

      setUsers(JSON.parse(text));
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const deleteUser = async (id) => {
    try {
      await axios.delete(`/api/reserve/${id}`);
      getUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  return (
    <div className="w-full">
      <h2 className="mb-6 text-xl font-bold text-slate-800 sm:text-2xl">
        Reservation List
      </h2>
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
              <button
                type="button"
                onClick={() => deleteUser(user.id)}
                className="mt-4 w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
              >
                Delete
              </button>
            </article>
          ))
        )}
      </div>
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
                  colSpan={6}
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
                    {user.phone_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {user.day}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {user.time}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => deleteUser(user.id)}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 transition-colors"
                    >
                      Delete
                    </button>
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
