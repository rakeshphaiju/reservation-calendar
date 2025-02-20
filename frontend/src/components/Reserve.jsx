import React from 'react';
import './reserve.css';
import moment from 'moment';
import Modal from './Modal';
import Input from './form/Input';
import Select from './form/Select';

const initialState = {
  user: {
    name: '',
    address: '',
    phone_number: '',
    ruoka: '',
    quantity: '',
  },
  nameError: '',
  addressError: '',
  phone_numberError: '',
  ruokaError: '',
  quantityError: '',
};

export default class Reserve extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      users: [],

      user: {
        name: '',
        address: '',
        phone_number: '',
        ruoka: '',
        quantity: '',
      },
      nameError: '',
      addressError: '',
      phone_numberError: '',
      ruokaError: '',
      quantityError: '',
      FoodOption: ['Option 1', 'Option 2 '],
      showModal: false,
      modalData: { day: '', time: '' },

      currentDate: new Date(),

      days: ['Friday', 'Saturday', 'Sunday'],
      times: ['17:00-17:30', '17:30-18:00', '18:00-18:30', '18:30-19:00', '19:00-19:30', '19:30-20:00', '20:00-20:30'],
      reservedTime: {
        friday: [],
        saturday: [],
        sunday: [],
      },
    };

    this.handleFullName = this.handleFullName.bind(this);
    this.handleAddress = this.handleAddress.bind(this);
    this.handlePhonenumber = this.handlePhonenumber.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleConfirmReservation = this.handleConfirmReservation.bind(this);
  }

  validate = () => {
    let nameError = '';
    let addressError = '';
    let phone_numberError = '';
    let ruokaError = '';
    let quantityError = '';

    if (!this.state.user.name) {
      nameError = 'Invalid name!!';
    }
    if (!this.state.user.address) {
      addressError = 'Invalid Address!!';
    }
    var phoneno = /^\d{10}$/;
    if (!this.state.user.phone_number.match(phoneno)) {
      phone_numberError = 'Invalid Phone number!!';
    }
    if (!this.state.user.ruoka) {
      ruokaError = 'Invalid food option!!';
    }
    if (this.state.user.quantity < 1) {
      quantityError = 'Invalid quantity!!';
    }

    if (nameError || addressError || phone_numberError || ruokaError || quantityError) {
      this.setState({ nameError, addressError, phone_numberError, ruokaError, quantityError });
      return false;
    }

    return true;
  };

  handleFullName(e) {
    let value = e.target.value;
    this.setState((prevState) => ({
      user: {
        ...prevState.user,
        name: value,
      },
    }));
  }

  handleAddress(e) {
    let value = e.target.value;
    this.setState((prevState) => ({
      user: {
        ...prevState.user,
        address: value,
      },
    }));
  }

  handlePhonenumber(e) {
    let value = e.target.value;
    this.setState((prevState) => ({
      user: {
        ...prevState.user,
        phone_number: value,
      },
    }));
  }

  handleInput(e) {
    let value = e.target.value;
    let name = e.target.name;
    this.setState((prevState) => ({
      user: {
        ...prevState.user,
        [name]: value,
      },
    }));
  }

  closeModalHandler = () => {
    this.setState({
      showModal: false,
    });
  };

  // show modal and save the day time in state
  showForm(day, time) {
    this.setState({
      showModal: true,
      modalData: {
        day,
        time,
      },
    });
  }

  componentDidMount() {
    this.getUsers();
  }

  getUsers = () => {
    fetch('http://localhost:8000/api/users')
      .then((res) => res.json())
      .then((json) => {
        this.setState({ users: json });
      })
      .catch((err) => console.error(err));
  };

  // reserve time slot after modal confirmation
  handleConfirmReservation = (e) => {
    e.preventDefault();

    const { reservedTime, modalData } = this.state;
    const loweredCaseDay = modalData.day.toLowerCase();
    const { user } = this.state;
    const isValid = this.validate();
    if (isValid) {
      fetch('http://localhost:8000/api/users/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: user.name,
          address: user.address,
          phone_number: user.phone_number,
          ruoka: user.ruoka,
          quantity: user.quantity,
          day: modalData.day,
          time: modalData.time,
        }),
      })
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! Status: ${res.status}`);
          }
          return res.json();
        })
        .then(() => {
          this.getUsers();
        })
        .catch((err) => console.error('Error:', err));

      if (Object.keys(reservedTime).includes(loweredCaseDay)) {
        const updatedReservedTime = [...reservedTime[loweredCaseDay], modalData.time];

        this.setState((prevState) => ({
          reservedTime: {
            ...prevState.reservedTime,
            [loweredCaseDay]: updatedReservedTime,
          },
          showModal: false,
          modalData: {},
        }));
      }
      this.setState(initialState);
    }
  };

  render() {
    const { currentDate, times, days, reservedTime, modalData, users } = this.state;

    const weeknumber = moment(currentDate).week();
    const fifthOfWeek = moment().startOf('isoWeek').add(4, 'd').format('MM-DD-YYYY');
    const endOfWeek = moment().endOf('isoWeek').format('MM-DD-YYYY');

    const timeHeader = times.map((time, i) => <th key={`header-time-${i}`}>{time}</th>);

    const timeList = days.map((day, index) => {
      let row = [];

      times.forEach((time) => {
        const reserved = reservedTime[day.toLowerCase()].includes(time);
        const dbReserved = (users ?? []).find((data) => {
          return data.day.toLowerCase() === day.toLowerCase() && data.time === time;
        });

        row.push(
          <td key={`${day}-${time}`} style={{ backgroundColor: reserved || dbReserved ? 'red' : '#fff' }}>
            <button disabled={reserved || dbReserved} onClick={() => this.showForm(day, time)}>
              {reserved || dbReserved ? 'Booked' : 'Book'}
            </button>
          </td>,
        );
      });

      return (
        <tr key={index}>
          <th>{day}</th>
          {row}
        </tr>
      );
    });

    return (
      <div>
        <h3>
          {' '}
          Week number = {weeknumber}
          <br />
          (From {fifthOfWeek} to {endOfWeek})
        </h3>
        <table>
          <thead>
            <tr>
              <th></th> {/* Empty <th> for the first column */}
              {timeHeader}
            </tr>
          </thead>
          <tbody>{timeList}</tbody>
        </table>
        <Modal className="modal" show={this.state.showModal} close={this.closeModalHandler}>
          <p>{`Would you like to reserve ${modalData.time} on ${modalData.day}??`}</p>
          <form>
            <Input
              inputtype={'text'}
              title={'Full Name'}
              name={'name'}
              value={this.state.user.name}
              placeholder={'Enter your name'}
              handlechange={this.handleInput}
              required
            />{' '}
            {/* Name of the user */}
            <div style={{ color: 'red', fontSize: 12 }}>{this.state.nameError}</div>
            <Input
              inputtype={'text'}
              title={'Address'}
              name={'address'}
              value={this.state.user.address}
              placeholder={'Enter your address'}
              handlechange={this.handleInput}
            />{' '}
            {/* Address of the user */}
            <div style={{ color: 'red', fontSize: 12 }}>{this.state.addressError}</div>
            <Input
              inputtype={'text'}
              title={'Phone number (0XXXXXXXXX)'}
              name={'phone_number'}
              value={this.state.user.phone_number}
              placeholder={'Enter your phone number'}
              handlechange={this.handleInput}
            />{' '}
            {/* Phone number */}
            <div style={{ color: 'red', fontSize: 12 }}>{this.state.phone_numberError}</div>
            <Select
              title={'Option'}
              name={'ruoka'}
              options={this.state.FoodOption}
              value={this.state.user.ruoka}
              placeholder={'Select Option'}
              handlechange={this.handleInput}
            />{' '}
            <div style={{ color: 'red', fontSize: 12 }}>{this.state.ruokaError}</div>
            <Input
              inputtype={'text'}
              title={'Quantity'}
              name={'quantity'}
              value={this.state.user.quantity}
              placeholder={'How about quantity??'}
              handlechange={this.handleInput}
              required
            />{' '}
            {/* quantity of food */}
            <div style={{ color: 'red', fontSize: 12 }}>{this.state.quantityError}</div>
            <button className="btn-reserve" onClick={this.handleConfirmReservation}>
              Reserve
            </button>
          </form>
        </Modal>
      </div>
    );
  }
}
