import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();

  const baseLinkClass =
    'px-3 py-1.5 rounded-lg font-medium text-sm transition-colors sm:px-4 sm:py-2 sm:text-base';
  const activeClass = 'bg-emerald-200 text-slate-900';
  const inactiveClass = 'text-slate-200 hover:bg-white/10 hover:text-white';

  const isActive = (path) => location.pathname === path;

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
          <ul className="mt-3 flex flex-wrap items-center gap-2 md:mt-0 md:gap-1">
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
