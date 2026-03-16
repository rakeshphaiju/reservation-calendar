import React from 'react';
import { PropTypes } from 'prop-types';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/header/Navbar';
import Reserve from './pages/Reserve';
import Reservationlist from './pages/ReservationList';
import Login from './pages/Login';
import { authService } from './services/auth';

function RequireAuth({ children }) {
  const location = useLocation();
  const [status, setStatus] = React.useState('checking'); // 'checking' | 'authed' | 'unauth'

  React.useEffect(() => {
    let isMounted = true;
    authService
      .init()
      .then((user) => {
        if (!isMounted) return;
        setStatus(user ? 'authed' : 'unauth');
      })
      .catch(() => {
        if (!isMounted) return;
        setStatus('unauth');
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (status === 'checking') {
    return null;
  }

  if (status === 'unauth') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

RequireAuth.propTypes = {
  children: PropTypes.node.isRequired,
};

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/reservations" element={<Reserve />} />
          <Route
            path="/reservelist"
            element={
              <RequireAuth>
                <Reservationlist />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<Login />} />
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
      Book your time for reservation
    </p>
    <div className="mt-10 flex flex-wrap justify-center gap-4">
      <Link
        to="/reservations"
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
