import React from 'react';
import { PropTypes } from 'prop-types';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/header/Navbar';
import Reserve from './pages/Reserve';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import { authService } from './services/auth';
import { reservationService } from './services/api';

function RequireAuth({ children }) {
  const location = useLocation();
  const [status, setStatus] = React.useState('checking');

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

function Home() {
  const [calendars, setCalendars] = React.useState([]);
  const [currentUser, setCurrentUser] = React.useState(authService.getUser());

  React.useEffect(() => {
    reservationService.getCalendars().then(setCalendars).catch(() => setCalendars([]));
    const unsubscribe = authService.subscribe((user) => setCurrentUser(user));
    return unsubscribe;
  }, []);

  return (
    <div className="space-y-10 py-8">
      <section className="text-center">
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight sm:text-5xl">
          Booking Nest
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          Each user can manage a separate reservation calendar and share a unique booking link.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          {currentUser?.calendar_slug ? (
            <>
              <Link
                to={`/calendar/${currentUser.calendar_slug}`}
                className="inline-flex items-center rounded-xl bg-emerald-500 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-600 transition-colors"
              >
                Open my calendar
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                Open owner dashboard
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center rounded-xl bg-slate-800 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-slate-700 transition-colors"
            >
              Sign in or create account
            </Link>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">Public calendars</h2>
          <p className="mt-1 text-sm text-slate-600">
            Share any of these direct links so people can book the right calendar.
          </p>
        </div>

        {calendars.length === 0 ? (
          <div className="rounded-xl bg-slate-50 px-4 py-10 text-center text-slate-500">
            No calendars yet. Create the first user account to get started.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {calendars.map((calendar) => (
              <Link
                key={calendar.calendar_slug}
                to={`/calendar/${calendar.calendar_slug}`}
                className="rounded-xl border border-slate-200 px-4 py-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
              >
                <div className="font-semibold text-slate-800">{calendar.username}</div>
                <div className="mt-1 text-sm text-slate-500">
                  /calendar/{calendar.calendar_slug}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/calendar/:ownerSlug" element={<Reserve />} />
          <Route path="/reservations" element={<Navigate to="/" replace />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<Login />} />
        </Routes>
      </main>
    </div>
  );
}
