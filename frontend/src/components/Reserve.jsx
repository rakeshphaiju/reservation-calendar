import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment';
import './reserve.css';
import Modal from './Modal';
import Input from './form/Input';

const Reserve = () => {
  const getUpcomingDates = () => {
    return ["Friday", "Saturday", "Sunday"].map((day) =>
      moment().isoWeekday(day).format("YYYY-MM-DD")
    );
  };

  const dates = getUpcomingDates();

  const [users, setUsers] = useState([]);
  const [user, setUser] = useState({
    name: '',
    address: '',
    phone_number: ''
  });
  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ day: '', time: '' });
  const [reservedTime, setReservedTime] = useState({
    [dates[0]]: [],
    [dates[1]]: [],
    [dates[2]]: []
  });

  const times = ['17:00-17:30', '17:30-18:00', '18:00-18:30', '18:30-19:00', '19:00-19:30', '19:30-20:00', '20:00-20:30'];

  useEffect(() => {
    axios.get('/api/reserve')
      .then((res) => setUsers(res.data))
      .catch((err) => console.error('Error fetching reservations:', err));
  }, []);

  const validate = () => {
    let newErrors = {};
    if (!user.name) newErrors.name = 'Invalid name!!';
    if (!user.address) newErrors.address = 'Invalid Address!!';
    if (!/^\d{10}$/.test(user.phone_number)) newErrors.phone_number = 'Invalid Phone number!!';
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

    axios.post('/api/reserve/add', { ...user, ...modalData })
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
        // Optional: show error to user
        if (err.response) {
          console.error('Server error:', err.response.data);
        }
      });
  };

  return (
    <div>
      <h3>Would you like to make any reservations on the following dates?</h3>
      <table>
        <thead>
          <tr>
            <th></th>
            {times.map((time, i) => <th key={i}>{time}</th>)}
          </tr>
        </thead>
        <tbody>
          {dates.map((day, index) => (
            <tr key={index}>
              <th>{day}</th>
              {times.map((time) => {
                const isReserved = reservedTime[day].includes(time) ||
                  users.some((data) => data.day === day && data.time === time);
                return (
                  <td key={`${day}-${time}`} style={{ backgroundColor: isReserved ? 'red' : '#fff' }}>
                    <button disabled={isReserved} onClick={() => showForm(day, time)}>
                      {isReserved ? 'Booked' : 'Book'}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {showModal && (
        <Modal show={showModal} close={() => setShowModal(false)}>
          <p>Would you like to reserve {modalData.time} on {modalData.day}?</p>
          <form>
            <Input title={'Full Name '} name='name' value={user.name} placeholder='Enter your name' handlechange={handleInput} required />
            <div style={{ color: 'red', fontSize: 12 }}>{errors.name}</div>
            <Input title={'Address '} name='address' value={user.address} placeholder='Enter your address' handlechange={handleInput} />
            <div style={{ color: 'red', fontSize: 12 }}>{errors.address}</div>
            <Input title={'Phone number '} name='phone_number' value={user.phone_number} placeholder='Enter your phone number' handlechange={handleInput} />
            <div style={{ color: 'red', fontSize: 12 }}>{errors.phone_number}</div>
            <button onClick={handleConfirmReservation}>Reserve</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Reserve;
