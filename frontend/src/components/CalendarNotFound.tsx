import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar } from '@fortawesome/free-solid-svg-icons';

import Button from './form/Button';

const CalendarNotFound = ({ ownerSlug }: { ownerSlug: string }) => {
    const navigate = useNavigate();

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
                <FontAwesomeIcon icon={faCalendar} className="h-10 w-10 text-amber-500" />
            </div>

            <h1 className="mb-3 text-2xl font-bold text-slate-800 sm:text-3xl">
                Calendar Not Available
            </h1>

            <p className="mb-2 max-w-md text-slate-500">
                <span className="font-semibold text-slate-700">{ownerSlug}</span>&apos;s
                reservation calendar hasn&apos;t been set up yet.
            </p>

            <p className="mb-8 max-w-md text-sm text-slate-400">
                If you believe this is a mistake, please contact the calendar owner directly.
            </p>

            <Button
                onClick={() => navigate('/')}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
                Go to Booking Nest
            </Button>
        </div>
    );
};

export default CalendarNotFound;