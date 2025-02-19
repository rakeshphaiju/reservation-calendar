import React, { useState, useEffect } from "react";
import "./reserve.css";
import moment from "moment";
import Modal from "./Modal";
import Input from "./form/Input";
import Select from "./form/Select";

const Reserve = () => {
  const initialState = {
    user: {
      name: "",
      address: "",
      phone_number: "",
      ruoka: "",
      quantity: "",
    },
    nameError: "",
    AddressError: "",
    phone_numberError: "",
    ruokaError: "",
    quantityError: "",
  };

  const [state, setState] = useState({
    ...initialState,
    users: [],
    FoodOption: ["Option 1", "Option 2"],
    showModal: false,
    modalData: { day: "", time: "" },
    currentDate: new Date(),
    days: ["Thursday", "Friday", "Saturday", "Sunday"],
    times: [
      "17:00-17:30",
      "17:30-18:00",
      "18:00-18:30",
      "18:30-19:00",
      "19:00-19:30",
      "19:30-20:00",
      "20:00-20:30",
    ],
    reservedTime: {
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    },
  });

  const handleInput = (e) => {
    const { name, value } = e.target;
    setState((prevState) => ({
      ...prevState,
      user: {
        ...prevState.user,
        [name]: value,
      },
    }));
  };

  const validate = () => {
    const { user } = state;
    let nameError = "";
    let AddressError = "";
    let phone_numberError = "";
    let ruokaError = "";
    let quantityError = "";

    if (!user.name) nameError = "Invalid name!!";
    if (!user.address) AddressError = "Invalid Address!!";
    if (!user.phone_number.match(/^\d{10}$/)) phone_numberError = "Invalid Phone number!!";
    if (!user.ruoka) ruokaError = "Invalid food option!!";
    if (user.quantity < 1) quantityError = "Invalid quantity!!";

    if (nameError || AddressError || phone_numberError || ruokaError || quantityError) {
      setState((prevState) => ({
        ...prevState,
        nameError,
        AddressError,
        phone_numberError,
        ruokaError,
        quantityError,
      }));
      return false;
    }
    return true;
  };

  const handleConfirmReservation = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const { modalData, user } = state;
    try {
      await fetch(
        `/users/add?name=${user.name}&Address=${user.address}&phone_number=${user.phone_number}&ruoka=${user.ruoka}&quantity=${user.quantity}&Day=${modalData.day}&time=${modalData.time}`
      );
      getUsers();
      setState((prevState) => ({
        ...prevState,
        showModal: false,
        modalData: {},
        ...initialState,
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const getUsers = async () => {
    try {
      const res = await fetch("/users");
      const json = await res.json();
      setState((prevState) => ({ ...prevState, users: json.data }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    getUsers();
  }, []);

  const { currentDate, times, days, reservedTime, modalData, users, showModal } = state;

  const weeknumber = moment(currentDate).week();
  const fifthOfWeek = moment().startOf("isoWeek").add(4, "d").format("MM-DD-YYYY");
  const endOfWeek = moment().endOf("isoWeek").format("MM-DD-YYYY");

  const timeHeader = times.map((time, i) => <th key={`header-time-${i}`}>{time}</th>);

  const timeList = days.map((day) => {
    const row = times.map((time) => {
      const reserved = reservedTime[day.toLowerCase()].includes(time);
      const dbReserved = users.find(
        (data) =>
          data.Day.toLowerCase() === day.toLowerCase() && data.time === time
      );

      return (
        <td key={`${day}-${time}`} bgcolor={reserved || dbReserved ? "red" : "#fff"}>
          <button
            disabled={reserved || dbReserved}
            onClick={() => setState((prevState) => ({ ...prevState, showModal: true, modalData: { day, time } }))}
          >
            {reserved || dbReserved ? "Booked" : "Book"}
          </button>
        </td>
      );
    });

    return (
      <tr key={day}>
        <th>{day}</th>
        {row}
      </tr>
    );
  });

  return (
    <div>
      <h3>
        Week number = {weeknumber}
        <br />
        (From {fifthOfWeek} to {endOfWeek})
      </h3>
      <table>
        <thead>
          <tr>
            <th />
            {timeHeader}
          </tr>
        </thead>
        <tbody>{timeList}</tbody>
      </table>
      <Modal show={showModal} close={() => setState((prevState) => ({ ...prevState, showModal: false }))}>
        <p>{`Would you like to reserve ${modalData.time} on ${modalData.day}?`}</p>
        <form>
          <Input
            inputtype="text"
            title="Full Name"
            name="name"
            value={state.user.name}
            placeholder="Enter your name"
            handlechange={handleInput}
          />
          <div style={{ color: "red", fontSize: 12 }}>{state.nameError}</div>
          <Input
            inputtype="text"
            title="Address"
            name="Address"
            value={state.user.address}
            placeholder="Enter your address"
            handlechange={handleInput}
          />
          <div style={{ color: "red", fontSize: 12 }}>{state.AddressError}</div>
          <Input
            inputtype="tel"
            title="Phone number (0XXXXXXXXX)"
            name="phone_number"
            value={state.user.phone_number}
            placeholder="Enter your phone number"
            handlechange={handleInput}
          />
          <div style={{ color: "red", fontSize: 12 }}>{state.phone_numberError}</div>
          <Select
            title="Option"
            name="ruoka"
            options={state.FoodOption}
            value={state.user.ruoka}
            placeholder="Select Option"
            handlechange={handleInput}
          />
          <div style={{ color: "red", fontSize: 12 }}>{state.ruokaError}</div>
          <Input
            inputype="number"
            title="Quantity"
            name="quantity"
            value={state.user.quantity}
            placeholder="How about quantity??"
            handlechange={handleInput}
          />
          <div style={{ color: "red", fontSize: 12 }}>{state.quantityError}</div>
          <button className="btn-reserve" onClick={handleConfirmReservation}>
            Reserve
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Reserve;