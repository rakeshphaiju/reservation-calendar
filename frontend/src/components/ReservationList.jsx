import React, { useState, useEffect } from 'react';
import './reservationlist.css';
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
      await axios.delete(`/api/delete/${id}`);
      getUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  return (
    <div className="App">
      <table>
        <thead>
          <tr>
            <th>Full name</th>
            <th>Address</th>
            <th>Phone number</th>
            <th>Food option</th>
            <th>Quantity</th>
            <th>Date</th>
            <th>Time</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.address}</td>
              <td>{user.phone_number}</td>
              <td>{user.food}</td>
              <td>{user.quantity}</td>
              <td>{user.day}</td>
              <td>{user.time}</td>
              <td>
                <button className="del-button" onClick={() => deleteUser(user.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ReservationList;