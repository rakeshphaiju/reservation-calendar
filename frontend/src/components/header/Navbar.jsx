import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import BookingNestLogo from '/images/Booking-Nest-logo.png';
import { authService } from '../../services/auth';

function getInitials(user) {
  if (user?.fullname?.trim()) {
    const [firstName, ...rest] = user.fullname.trim().split(' ');
    const lastName = rest.join(' ');

    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }

    if (firstName) {
      return firstName.slice(0, 2).toUpperCase();
    }
  }

  const usernameParts = user?.username
    ?.trim()
    ?.split(/[\s._-]+/)
    .filter(Boolean);

  if (usernameParts?.length >= 2) {
    return `${usernameParts[0][0]}${usernameParts[1][0]}`.toUpperCase();
  }

  return user?.username?.slice(0, 2).toUpperCase() || 'U';
}

function getDisplayName(user) {
  const firstName = user?.first_name?.trim();
  const lastName = user?.last_name?.trim();

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  if (firstName) {
    return firstName;
  }

  return user?.fullname || 'User';
}

export default function Navbar() {
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getUser());
  const [isOpen, setIsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const dropdownRef = useRef(null);

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextUser) => {
      setUser(nextUser);
    });
    authService.init();
    return unsubscribe;
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const timeWithZone = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'shortOffset',
  }).format(currentTime);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const username = user?.username;
  const initials = getInitials(user);
  const displayName = getDisplayName(user);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const pillClass =
    'inline-flex items-center rounded-full bg-indigo-50 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-900';

  return (
    <nav className="relative z-20 w-full">
      <div className="mx-auto max-w-7xl px-4 pt-0 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2">
          <Link to="/" className="inline-flex shrink-0 items-center">
            <img
              src={BookingNestLogo}
              alt="Booking Nest"
              className="h-10 w-auto sm:h-10 md:h-12"
            />
          </Link>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm font-medium text-slate-500 sm:inline">
              {timeWithZone}
            </span>

            {user?.calendar_slug && user?.calendar_created && (
              <Link
                to={`/calendar/${user.calendar_slug}`}
                className={`${pillClass} hidden md:inline-flex`}
              >
                My Calendar
              </Link>
            )}

            {username ? (
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setIsOpen((prev) => !prev)}
                  className={`${pillClass} gap-1 font-medium`}
                >
                  <span className="flex items-center justify-center text-xm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900">
                    {initials}
                  </span>

                  <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    ▾
                  </span>
                </button>

                {isOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {displayName}
                      </p>
                      <p className="text-xs text-slate-500">{username}</p>
                    </div>

                    <div className="p-2">
                      <Link
                        to="/dashboard"
                        onClick={() => setIsOpen(false)}
                        className="block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Dashboard
                      </Link>

                      {user?.calendar_slug && user?.calendar_created && (
                        <Link
                          to={`/calendar/${user.calendar_slug}`}
                          onClick={() => setIsOpen(false)}
                          className="mt-1 block rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 md:hidden"
                        >
                          My Calendar
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          handleLogout();
                        }}
                        className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className={pillClass}>
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}