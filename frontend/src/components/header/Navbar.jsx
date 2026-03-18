import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth';

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
              <li>
                <Link
                  to="/reservations"
                  className={`${baseLinkClass} ${isActive('/reservations') ? activeClass : inactiveClass}`}
                >
                  Reserve
                </Link>
              </li>
              <li>
                <Link
                  to="/reservelist"
                  className={`${baseLinkClass} ${isActive('/reservelist') ? activeClass : inactiveClass}`}
                >
                  Reservation List
                </Link>
              </li>
            </ul>

            <div className="flex items-center gap-2">
              {username ? (
                <>
                  <span className="hidden text-sm text-slate-200 sm:inline">
                    Signed in as <span className="font-semibold">{username}</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-white/20"
                  >
                    Logout
                  </button>
                </>
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
