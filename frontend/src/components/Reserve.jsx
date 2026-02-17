import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import Modal from './Modal';
import Input from './form/Input';

const Reserve = () => {
  const getUpcomingDates = () => {
    return ['Friday', 'Saturday', 'Sunday'].map((day) =>
      moment().isoWeekday(day).format('YYYY-MM-DD')
    );
  };

  const dates = getUpcomingDates();

  const [users, setUsers] = useState([]);
  const [user, setUser] = useState({
    name: '',
    address: '',
    phone_number: '',
  });
  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ day: '', time: '' });
  const [reservedTime, setReservedTime] = useState({
    [dates[0]]: [],
    [dates[1]]: [],
    [dates[2]]: [],
  });

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
      .then((res) => setUsers(res.data))
      .catch((err) => console.error('Error fetching reservations:', err));
  }, []);

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

  const isTimeReserved = (day, time) =>
    reservedTime[day].includes(time) ||
    users.some((data) => data.day === day && data.time === time);

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

  return (
    <div>
      <h2 className="mb-8 text-center text-xl font-bold text-slate-800 sm:text-2xl">
        Would you like to make a reservation on the following dates?
      </h2>
      <div className="space-y-5 md:hidden">
        {dates.map((day) => (
          <section
            key={day}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h3 className="mb-3 text-base font-semibold text-slate-800">
              {day}
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {times.map((time) => {
                const isReserved = isTimeReserved(day, time);
                return (
                  <button
                    key={`${day}-${time}`}
                    type="button"
                    disabled={isReserved}
                    onClick={() => showForm(day, time)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      isReserved
                        ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                        : 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-500'
                    }`}
                  >
                    <span className="block font-medium">{time}</span>
                    <span className="block text-xs opacity-90">
                      {isReserved ? 'Booked' : 'Tap to book'}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
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
                  {day}
                </th>
                {times.map((time) => {
                  const isReserved = isTimeReserved(day, time);
                  return (
                    <td
                      key={`${day}-${time}`}
                      className={`px-2 py-2 align-middle ${
                        isReserved ? 'bg-red-50' : 'bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={isReserved}
                        onClick={() => showForm(day, time)}
                        className={`h-20 w-full rounded-lg text-sm font-medium transition-all ${isReserved
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
            <span className="font-semibold text-slate-800">{modalData.day}</span>?
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
