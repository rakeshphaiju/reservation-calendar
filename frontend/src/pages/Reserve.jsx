import React, { useState, useEffect } from 'react';
import moment from 'moment';

import Button from '../components/form/Button';
import SlotButton from '../components/SlotButton';
import ReservationModal from '../components/ReservationModal';
import { reservationService } from '../services/api';

const SLOT_CAPACITY = 5;

const Reserve = () => {
  const [startDate, setStartDate] = useState(moment());

  const getUpcomingDates = () => {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => {
      const targetDay = moment().day(day).day();
      const currentDay = startDate.day();
      let daysToAdd = targetDay - currentDay;
      if (daysToAdd < 0) daysToAdd += 7;
      if (daysToAdd === 0) daysToAdd = 7;
      return startDate.clone().add(daysToAdd, 'days').format('YYYY-MM-DD');
    });
  };

  const handlePreviousWeek = () => {
    const prevMonday = startDate.clone().subtract(1, 'week').isoWeekday(1);
    const prevFriday = prevMonday.clone().isoWeekday(5);
    if (prevFriday.isAfter(moment(), 'day')) {
      setStartDate(prevMonday);
    }
  };

  const handleNextWeek = () => {
    const maxDate = moment().add(4, 'weeks');
    const nextMonday = startDate.clone().add(1, 'week').isoWeekday(1);
    if (nextMonday.isSameOrBefore(maxDate, 'day')) {
      setStartDate(nextMonday);
    }
  };

  const dates = getUpcomingDates();
  const times = [
    '10:00-11:00', '11:00-12:00', '12:00-13:00',
    '13:00-14:00', '15:00-16:00', '16:00-17:00', '17:00-18:00',
  ];

  const [slotCounts, setSlotCounts] = useState({});
  const [fullyBookedSlots, setFullyBookedSlots] = useState([]);
  const [user, setUser] = useState({ name: '', address: '', email: '', phone_number: '' });
  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ day: '', time: '' });

  useEffect(() => {
    reservationService
      .getSlots()
      .then((slots) => {
        const counts = {};
        const fullyBooked = [];
        slots.forEach(({ day, time, count }) => {
          if (!counts[day]) counts[day] = {};
          counts[day][time] = count;
          if (count >= SLOT_CAPACITY) fullyBooked.push({ day, time });
        });
        setSlotCounts(counts);
        setFullyBookedSlots(fullyBooked);
      })
      .catch(() => console.log('Failed to load reserved slots'));
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

  const isFullyBooked = (day, time) =>
    fullyBookedSlots.some((s) => s.day === day && s.time === time);

  const getSlotCount = (day, time) => slotCounts?.[day]?.[time] ?? 0;

  const getSpotsLeft = (day, time) => {
    if (isFullyBooked(day, time)) return 0;
    return SLOT_CAPACITY - getSlotCount(day, time);
  };

  const isPastOrToday = (day, time) => {
    const startTime = time.split('-')[0];
    const slotStart = moment(`${day} ${startTime}`, 'YYYY-MM-DD HH:mm');
    return slotStart.isSameOrBefore(moment());
  };

  const handleConfirmReservation = async (e) => {
    e.preventDefault();
    try {
      const newReservation = { ...user, ...modalData };
      await reservationService.create(newReservation);
      setSlotCounts((prev) => {
        const daySlots = prev[modalData.day] || {};
        const current = daySlots[modalData.time] ?? 0;
        const newCount = current + 1;
        if (newCount >= SLOT_CAPACITY) {
          setFullyBookedSlots((fb) => [...fb, { day: modalData.day, time: modalData.time }]);
        }
        return {
          ...prev,
          [modalData.day]: { ...daySlots, [modalData.time]: newCount },
        };
      });
      setShowModal(false);
      setUser({ name: '', address: '', email: '', phone_number: '' });
    } catch (err) {
      if (err.response?.status === 409)
        setErrors({ general: err.response.data?.detail || 'This slot is already reserved.' });
      else if (err.response?.status === 400)
        setErrors({ general: 'Please check your input fields.' });
      else
        setErrors({ general: 'Server error. Please try again later.' });
    }
  };

  const slotProps = { isPastOrToday, isFullyBooked, getSpotsLeft, showForm };

  return (
    <div>
      <h2 className="mb-8 text-center text-xl font-bold text-slate-800 sm:text-2xl">
        Would you like to make a reservation on the following dates?
      </h2>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">
          Your reservation calendar
        </h2>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handlePreviousWeek}
            disabled={startDate.clone().subtract(1, 'week').isoWeekday(5).isSameOrBefore(moment(), 'day')}
            className="px-3 py-1.5 bg-gray-600 text-gray-700 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            Previous Week
          </Button>
          <Button
            onClick={handleNextWeek}
            disabled={startDate.clone().add(1, 'week').isoWeekday(1).isAfter(moment().add(4, 'weeks'), 'day')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Next Week
          </Button>
        </div>
      </div>

      {/* Mobile */}
      <div className="space-y-5 md:hidden">
        {dates.map((day) => (
          <section key={day} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-base font-semibold text-slate-800">
              {moment(day).format('dddd, MMMM D')}
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {times.map((time) => (
                <SlotButton key={`${day}-${time}`} day={day} time={time} mobile {...slotProps} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
              {times.map((time, i) => (
                <th key={i} className="px-3 py-3 text-center text-sm font-semibold text-slate-700 whitespace-nowrap">
                  {time}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.map((day, index) => (
              <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 whitespace-nowrap">
                  {moment(day).format('dddd, MMMM D')}
                </th>
                {times.map((time) => (
                  <td
                    key={`${day}-${time}`}
                    className={`px-2 py-2 ${isFullyBooked(day, time) ? 'bg-red-50' : ''}`}
                  >
                    <SlotButton day={day} time={time} {...slotProps} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
