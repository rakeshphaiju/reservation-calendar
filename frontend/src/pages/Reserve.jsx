import React, { useState, useEffect } from 'react';
import moment from 'moment';
import Button from '../components/form/Button';
import ReservationModal from '../components/ReservationModal';
import { reservationService } from '../services/api';

const Reserve = () => {
  const getUpcomingDates = () => {
    const today = moment();
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => {
      const targetDay = moment().day(day).day();
      const currentDay = today.day();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd < 0) daysToAdd += 7;
      if (daysToAdd === 0) daysToAdd = 7;
      return today.clone().add(daysToAdd, 'days').format('YYYY-MM-DD');
    });
  };

  const dates = getUpcomingDates();
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState({ name: '', address: '', email: '', phone_number: '' });
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

  // Fetch reservations
  useEffect(() => {
    reservationService
      .getAll()
      .then(setUsers)
      .catch(() => console.log('Failed to load existing reservations'));
  }, []);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const showForm = (day, time) => {
    setUser({ name: '', address: '', email: '', phone_number: '' });
    setErrors({});
    setShowModal(true);
    setModalData({ day, time });
  };

  const isTimeReserved = (day, time) =>
    reservedTime[day]?.includes(time) ||
    users.some((data) => data.day === day && data.time === time);

  const handleConfirmReservation = async (e) => {
    e.preventDefault();

    try {
      const newReservation = { ...user, ...modalData };
      await reservationService.create(newReservation);

      setUsers([...users, newReservation]);
      setReservedTime((prev) => ({
        ...prev,
        [modalData.day]: [...(prev[modalData.day] || []), modalData.time],
      }));
      setShowModal(false);
      setUser({ name: '', address: '', email: '', phone_number: '' });
    } catch (err) {
      if (err.response && err.response.status === 422)
        setErrors({ general: 'Please check your input fields.' });
      else setErrors({ general: 'Server error. Please try again later.' });
    }
  };

  return (
    <div>
      <h2 className="mb-8 text-center text-xl font-bold text-slate-800 sm:text-2xl">
        Would you like to make a reservation on the following dates?
      </h2>

      {/* Mobile section */}
      <div className="space-y-5 md:hidden">
        {dates.map((day) => (
          <section key={day} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-base font-semibold text-slate-800">
              {moment(day).format('dddd, MMMM D')}
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {times.map((time) => {
                const isReserved = isTimeReserved(day, time);
                return (
                  <Button
                    key={`${day}-${time}`}
                    disabled={isReserved}
                    onClick={() => showForm(day, time)}
                    className={`px-3 py-2 text-left border ${isReserved ? 'border-slate-200' : 'border-emerald-600'
                      }`}
                  >
                    <span className="block font-medium">{time}</span>
                    <span className="block text-xs opacity-90">
                      {isReserved ? 'Booked' : 'Tap to book'}
                    </span>
                  </Button>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
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
                  {moment(day).format('dddd, MMMM D')}
                </th>
                {times.map((time) => {
                  const isReserved = isTimeReserved(day, time);
                  return (
                    <td key={`${day}-${time}`} className={`px-2 py-2 ${isReserved ? 'bg-red-50' : ''}`}>
                      <Button
                        disabled={isReserved}
                        onClick={() => showForm(day, time)}
                        className="h-20 w-full"
                      >
                        {isReserved ? 'Booked' : 'Book'}
                      </Button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal extracted */}
      <ReservationModal
        show={showModal}
        close={() => setShowModal(false)}
        modalData={modalData}
        user={user}
        errors={errors}
        handleInput={handleInput}
        handleConfirm={handleConfirmReservation}
      />
    </div>
  );
};

export default Reserve;
