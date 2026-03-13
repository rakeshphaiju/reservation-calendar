import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import Button from '../components/form/Button';
import ReservationModal from '../components/ReservationModal';
import { reservationService } from '../services/api';

const SLOT_CAPACITY = 5;

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
  const times = [
    '17:00-17:30', '17:30-18:00', '18:00-18:30',
    '18:30-19:00', '19:00-19:30', '19:30-20:00', '20:00-20:30',
  ];

  // slotCounts: { "2026-03-17": { "17:00-17:30": 3, ... } }
  const [slotCounts, setSlotCounts] = useState({});
  // fullyBooked: slots returned by backend (count >= SLOT_CAPACITY)
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
          if (count >= SLOT_CAPACITY) {
            fullyBooked.push({ day, time });
          }
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

  // A slot is fully booked if backend returned it in the slots list
  const isFullyBooked = (day, time) =>
    fullyBookedSlots.some((s) => s.day === day && s.time === time);

  // Get count of bookings for a slot from local optimistic state
  const getSlotCount = (day, time) => slotCounts?.[day]?.[time] ?? 0;

  const getSpotsLeft = (day, time) => {
    if (isFullyBooked(day, time)) return 0;
    return SLOT_CAPACITY - getSlotCount(day, time);
  };

  const handleConfirmReservation = async (e) => {
    e.preventDefault();
    try {
      const newReservation = { ...user, ...modalData };
      await reservationService.create(newReservation);

      // Optimistically increment local slot count
      setSlotCounts((prev) => {
        const daySlots = prev[modalData.day] || {};
        const current = daySlots[modalData.time] ?? 0;
        const newCount = current + 1;
        // If now fully booked, add to fullyBooked list
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

  const SlotButton = ({ day, time, mobile = false }) => {
    const booked = isFullyBooked(day, time);
    const spotsLeft = getSpotsLeft(day, time);

    return (
      <Button
        disabled={booked}
        onClick={() => showForm(day, time)}
        className={mobile
          ? `px-3 py-2 text-left border ${booked ? 'border-slate-200' : 'border-emerald-600'}`
          : `h-20 w-full`
        }
      >
        {mobile ? (
          <>
            <span className="block font-medium">{time}</span>
            <span className="block text-xs opacity-90">
              {booked ? 'Fully booked' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <span>{booked ? 'Full' : 'Book'}</span>
            {!booked && (
              <span className="text-xs opacity-80">
                {spotsLeft}/{SLOT_CAPACITY} left
              </span>
            )}
          </div>
        )}
      </Button>
    );
  };

  SlotButton.propTypes = {
    day: PropTypes.string.isRequired,
    time: PropTypes.string.isRequired,
    mobile: PropTypes.bool,
  };

  return (
    <div>
      <h2 className="mb-8 text-center text-xl font-bold text-slate-800 sm:text-2xl">
        Would you like to make a reservation on the following dates?
      </h2>

      {/* Mobile */}
      <div className="space-y-5 md:hidden">
        {dates.map((day) => (
          <section key={day} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-base font-semibold text-slate-800">
              {moment(day).format('dddd, MMMM D')}
            </h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {times.map((time) => (
                <SlotButton key={`${day}-${time}`} day={day} time={time} mobile />
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
                    <SlotButton day={day} time={time} />
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
