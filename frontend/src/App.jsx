import React from 'react';
import { PropTypes } from 'prop-types';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';

import Navbar from './components/header/Navbar';
import Home from './pages/Home';
import Reserve from './pages/Reserve';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import ReservationListPage from './pages/ReservationListPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import VerifyEmail from './pages/VerifyEmail';
import { authService } from './services/authService';

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

  if (status === 'checking') return null;

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
    <div className="bg-linear-to-b from-blue-200 min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/calendar/:ownerSlug" element={<Reserve />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route path="/reservations" element={<RequireAuth><ReservationListPage /></RequireAuth>} />
          <Route path="/login" element={<Login />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Routes>
      </main>
    </div>
  );
}