import React, { Component } from 'react';
import './reservationlist.css';
import axios from 'axios';

class Reservationlist extends Component {
  constructor(props) {
    super(props);

    this.state = {
      users: [],
    };

    // Bind the deleteUser method
    this.deleteUser = this.deleteUser.bind(this);
  }

  componentDidMount() {
    this.getUsers();
  }

  // Fetch users from the backend
  // getUsers = async () => {
  //   try {
  //     const response = await fetch("http://localhost:8000/users", {
  //       mode: "no-cors"
  //     });
  //     const data = await response.json();
  //     this.setState({ users: data.data });
  //   } catch (err) {
  //     console.error("Error fetching users:", err);
  //   }
  // };

  getUsers = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/users');

      const text = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      if (!text) {
        throw new Error('Empty response from server.');
      }

      const data = JSON.parse(text);
      this.setState({ users: data });
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // Delete a user by ID
  deleteUser = async (id) => {
    try {
      await axios.delete(`http://localhost:8000/api/delete/${id}`);
      this.getUsers(); // Refresh the list after deletionAction
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  render() {
    const { users } = this.state;
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
              <th>Day</th>
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
                <td>{user.ruoka}</td>
                <td>{user.quantity}</td>
                <td>{user.day}</td>
                <td>{user.time}</td>
                <td>
                  <button className="del-button" onClick={() => this.deleteUser(user.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
}

export default Reservationlist;
