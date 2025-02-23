import React, { useState, useEffect } from 'react';
import './reserve.css';
import moment from 'moment';
import Modal from './Modal';
import Input from './form/Input';
import Select from './form/Select';

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
    phone_number: '',
    food: '',
    quantity: '',
  });
  const [errors, setErrors] = useState({});
  const [foodOptions] = useState(['Option 1', 'Option 2']);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ day: '', time: '' });
  const [reservedTime, setReservedTime] = useState({
    [dates[0]]: [],
    [dates[1]]: [],
    [dates[2]]: []
  });

  const times = ['17:00-17:30', '17:30-18:00', '18:00-18:30', '18:30-19:00', '19:00-19:30', '19:30-20:00', '20:00-20:30'];

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((err) => console.error(err));
  }, []);

  const validate = () => {
    let newErrors = {};
    if (!user.name) newErrors.name = 'Invalid name!!';
    if (!user.address) newErrors.address = 'Invalid Address!!';
    if (!/^\d{10}$/.test(user.phone_number)) newErrors.phone_number = 'Invalid Phone number!!';
    if (!user.food) newErrors.food = 'Invalid food option!!';
    if (user.quantity < 1) newErrors.quantity = 'Invalid quantity!!';
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

    fetch('/api/users/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, ...modalData }),
    })
      .then((res) => res.json())
      .then(() => {
        setUsers([...users, { ...user, ...modalData }]);
        setReservedTime((prev) => ({
          ...prev,
          [modalData.day]: [...prev[modalData.day], modalData.time],
        }));
        setShowModal(false);
        setUser({ name: '', address: '', phone_number: '', food: '', quantity: '' });
      })
      .catch((err) => console.error('Error:', err));
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
            <Select title={'Option '} name='food' options={foodOptions} value={user.food} placeholder='Select Option' handlechange={handleInput} />
            <div style={{ color: 'red', fontSize: 12 }}>{errors.food}</div>
            <Input title={'Quantity '} name='quantity' value={user.quantity} placeholder='Enter quantity' handlechange={handleInput} required />
            <div style={{ color: 'red', fontSize: 12 }}>{errors.quantity}</div>
            <button onClick={handleConfirmReservation}>Reserve</button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Reserve;
