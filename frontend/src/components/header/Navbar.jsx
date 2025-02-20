import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="bg-gray-900 text-white p-4">
      <ul className="flex space-x-4">
        <li>
          <Link to="/" className="hover:text-gray-400">
            Home
          </Link>
        </li>
        <li>
          <Link to="/about" className="hover:text-gray-400">
            About
          </Link>
        </li>
        <li>
          <Link to="/contact" className="hover:text-gray-400">
            Contact
          </Link>
        </li>
        <li>
          <Link to="/reserve" className="hover:text-gray-400">
            Reserve
          </Link>
        </li>
        <li>
          <Link to="/reservelist" className="hover:text-gray-400">
            Reservation List
          </Link>
        </li>
      </ul>
    </nav>
  );
}
