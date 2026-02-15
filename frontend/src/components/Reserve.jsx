import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import Modal from './Modal';
import Input from './form/Input';

const Reserve = () => {
  const getUpcomingDates = () => {
    const today = moment().startOf('day');
    const upcomingDates = [];

    // Look ahead 2 weeks
    for (let week = 0; week < 2; week++) {
      ['Friday', 'Saturday', 'Sunday'].forEach((day) => {
        const date = moment().add(week, 'weeks').isoWeekday(day);

        // Only include future dates (not today if you want to exclude today)
        // Use .isAfter for strictly future, or .isSameOrAfter to include today
        if (date.isAfter(today, 'day')) {
          upcomingDates.push(date.format('YYYY-MM-DD'));
        }
      });
    }

    // Sort chronologically and remove any duplicates
    return [...new Set(upcomingDates)].sort();
  };

  const dates = getUpcomingDates();

  // Log to verify no past dates
  console.log('Available dates:', dates);
  console.log('Today is:', moment().format('YYYY-MM-DD'));

  const [users, setUsers] = useState([]);
  const [user, setUser] = useState({
    name: '',
    address: '',
    phone_number: '',
  });
  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ day: '', time: '' });

  // Initialize reservedTime with all dates
  const [reservedTime, setReservedTime] = useState(
    Object.fromEntries(dates.map(date => [date, []]))
  );

  const times = [
    '17:00-17:30',
    '17:30-18:00',
    '18:00-18:30',
    '18:30-19:00',
    '19:00-19:30',
    '19:30-20:00',
    '20:00-20:30',
  ];

  useEffect(() => {
    axios
      .get('/api/reserve')
      .then((res) => {
        setUsers(res.data);

        // Update reserved times based on fetched data
        const reserved = {};
        dates.forEach(date => reserved[date] = []);

        res.data.forEach(reservation => {
          if (reserved[reservation.day]) {
            reserved[reservation.day].push(reservation.time);
          }
        });

        setReservedTime(reserved);
      })
      .catch((err) => console.error('Error fetching reservations:', err));
  }, []); // Empty dependency array - runs once on mount

  const validate = () => {
    let newErrors = {};
    if (!user.name) newErrors.name = 'Invalid name!!';
    if (!user.address) newErrors.address = 'Invalid Address!!';
    if (!/^\d{10}$/.test(user.phone_number))
      newErrors.phone_number = 'Invalid Phone number!!';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setUser((prevUser) => ({ ...prevUser, [name]: value }));
  };

  const showForm = (day, time) => {
    setShowModal(true);
    setModalData({ day, time });
  };

  const handleConfirmReservation = (e) => {
    e.preventDefault();
    if (!validate()) return;

    axios
      .post('/api/reserve/add', { ...user, ...modalData })
      .then((res) => {
        setUsers([...users, { ...user, ...modalData }]);
        setReservedTime((prev) => ({
          ...prev,
          [modalData.day]: [...prev[modalData.day], modalData.time],
        }));
        setShowModal(false);
        setUser({ name: '', address: '', phone_number: '' });
      })
      .catch((err) => {
        console.error('Error creating reservation:', err);
        if (err.response) {
          console.error('Server error:', err.response.data);
        }
      });
  };

  // Don't render if no dates available
  if (dates.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          No upcoming reservations available
        </h2>
        <p className="text-slate-600">
          Please check back later for available dates.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 text-center mb-8">
        Would you like to make a reservation on the following dates?
      </h2>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Date
              </th>
              {times.map((time, i) => (
                <th
                  key={i}
                  className="px-3 py-3 text-center text-sm font-semibold text-slate-700 whitespace-nowrap"
                >
                  {time}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.map((day, index) => (
              <tr
                key={index}
                className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors"
              >
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 whitespace-nowrap">
                  {moment(day).format('dddd, MMM D')}
                </th>
                {times.map((time) => {
                  const isReserved =
                    (reservedTime[day] || []).includes(time) ||
                    users.some(
                      (data) => data.day === day && data.time === time
                    );
                  return (
                    <td
                      key={`${day}-${time}`}
                      className={`px-2 py-2 align-middle ${isReserved ? 'bg-red-50' : 'bg-white'
                        }`}
                    >
                      <button
                        type="button"
                        disabled={isReserved}
                        onClick={() => showForm(day, time)}
                        className={`w-full h-20 rounded-lg text-sm font-medium transition-all ${isReserved
                          ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                          : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-[0.98]'
                          }`}
                      >
                        {isReserved ? 'Booked' : 'Book'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <Modal show={showModal} close={() => setShowModal(false)}>
          <p className="text-slate-600 mb-6">
            Reserve <span className="font-semibold text-slate-800">{modalData.time}</span> on{' '}
            <span className="font-semibold text-slate-800">
              {moment(modalData.day).format('dddd, MMM D')}
            </span>?
          </p>
          <form className="space-y-4 text-left">
            <Input
              title="Full Name"
              name="name"
              value={user.name}
              placeholder="Enter your name"
              handlechange={handleInput}
              required
            />
            <div className="text-red-500 text-sm min-h-[1.25rem]">
              {errors.name}
            </div>
            <Input
              title="Address"
              name="address"
              value={user.address}
              placeholder="Enter your address"
              handlechange={handleInput}
            />
            <div className="text-red-500 text-sm min-h-[1.25rem]">
              {errors.address}
            </div>
            <Input
              title="Phone number"
              name="phone_number"
              value={user.phone_number}
              placeholder="Enter your phone number (10 digits)"
              handlechange={handleInput}
            />
            <div className="text-red-500 text-sm min-h-[1.25rem]">
              {errors.phone_number}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReservation}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                Reserve
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Reserve;