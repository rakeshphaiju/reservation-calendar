import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Navbar from './components/header/Navbar';
import Reserve from './pages/Reserve';
import Reservationlist from './pages/ReservationList';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reserve" element={<Reserve />} />
          <Route path="/reservelist" element={<Reservationlist />} />
        </Routes>
      </main>
    </div>
  );
}

const Home = () => (
  <div className="text-center py-16">
    <h1 className="text-4xl font-bold text-slate-800 tracking-tight sm:text-5xl">
      Welcome to Reservation Calendar
    </h1>
    <p className="mt-4 text-lg text-slate-600 max-w-xl mx-auto">
      Book your table for Friday, Saturday, or Sunday. Choose a time slot and we&apos;ll take care of the rest.
    </p>
    <div className="mt-10 flex flex-wrap justify-center gap-4">
      <Link
        to="/reserve"
        className="inline-flex items-center rounded-xl bg-emerald-200 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
      >
        Make a reservation
      </Link>
      <Link
        to="/reservelist"
        className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
      >
        View reservations
      </Link>
    </div>
  </div>
);
