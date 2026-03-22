import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';

function getInitials(user) {
  const firstName = user?.first_name?.trim();
  const lastName = user?.last_name?.trim();

  if (firstName && lastName) {
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  }

  if (firstName) {
    return firstName.slice(0, 2).toUpperCase();
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

  return user?.username || 'User';
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getUser());

  const baseLinkClass =
    'px-3 py-1.5 rounded-lg font-medium text-sm transition-colors sm:px-4 sm:py-2 sm:text-base';
  const activeClass = 'bg-emerald-200 text-slate-900';
  const inactiveClass = 'text-slate-200 hover:bg-white/10 hover:text-white';

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const unsubscribe = authService.subscribe((nextUser) => {
      setUser(nextUser);
    });
    authService.init();
    return unsubscribe;
  }, []);

  const username = user?.username;
  const initials = getInitials(user);
  const displayName = getDisplayName(user);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <nav className="bg-slate-800 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 md:flex md:items-center md:justify-between md:h-14 md:py-0">
          <Link
            to="/"
            className="inline-block text-lg font-bold text-white tracking-tight sm:text-xl"
          >
            Reservation Calendar
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3 md:mt-0">
            <ul className="flex flex-wrap items-center gap-2 md:gap-1">
              <li>
                <Link
                  to="/"
                  className={`${baseLinkClass} ${isActive('/') ? activeClass : inactiveClass}`}
                >
                  Home
                </Link>
              </li>
              {user?.calendar_slug && (
                <li>
                  <Link
                    to={`/calendar/${user.calendar_slug}`}
                    className={`${baseLinkClass} ${location.pathname === `/calendar/${user.calendar_slug}` ? activeClass : inactiveClass}`}
                  >
                    My Calendar
                  </Link>
                </li>
              )}
            </ul>

            <div className="flex items-center gap-2">
              {username ? (
                <details className="group relative">
                  <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-2.5 py-2 text-left hover:bg-white/15">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-300 font-semibold text-slate-900">
                      {initials}
                    </span>
                    <span className="text-slate-300 transition-transform group-open:rotate-180">
                      ▾
                    </span>
                  </summary>

                  <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                    <div className="border-b border-slate-100 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{displayName}</p>
                      <p className="text-xs text-slate-500">{username}</p>
                    </div>
                    <div className="p-2">
                      <Link
                        to="/dashboard"
                        className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Dashboard
                      </Link>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </details>
              ) : (
                <Link
                  to="/login"
                  className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
                >
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
