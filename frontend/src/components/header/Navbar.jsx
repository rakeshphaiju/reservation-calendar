import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();

  const baseLinkClass =
    'px-4 py-2 rounded-lg font-medium transition-colors';
  const activeClass = 'bg-emerald-600 text-white';
  const inactiveClass = 'text-slate-200 hover:bg-white/10 hover:text-white';

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-slate-800 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="text-xl font-bold text-white tracking-tight">
            Reservation Calendar
          </Link>
          <ul className="flex items-center gap-1">
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
                to="/reserve"
                className={`${baseLinkClass} ${isActive('/reserve') ? activeClass : inactiveClass}`}
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
        </div>
      </div>
    </nav>
  );
}
