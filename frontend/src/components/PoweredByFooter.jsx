import React from 'react';
import { Link } from 'react-router-dom';

export default function PoweredByFooter() {
    return (
        <div className="text-center mt-8 text-xs text-gray-500">
            <hr className="my-4 border-t border-gray-200" />
            <Link to="/" target="_blank" rel="noopener noreferrer">
                <p>Powered by Booking Nest</p>
            </Link>
        </div>
    );
}