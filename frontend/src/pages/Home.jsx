import React from 'react';
import { Link } from 'react-router-dom';

import { authService } from '../services/auth';
import { reservationService } from '../services/api';
import PublicCalendarsSection from '../components/PublicCalendarsSection';

export default function Home() {
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
                <p className="mt-4 text-xl font-bold text-slate-800 tracking-tight sm:text-xl">
                    &ldquo;Create your own booking page.&rdquo;
                </p>
                <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
                    Manage a separate reservation calendar and share a unique booking link.
                </p>
                <div className="mt-10 flex flex-wrap justify-center gap-4">
                    {currentUser ? (
                        <>
                            <Link
                                to="/dashboard"
                                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
                            >
                                Open owner dashboard
                            </Link>
                            {currentUser.calendar_created && (
                                <Link
                                    to={`/calendar/${currentUser.calendar_slug}`}
                                    className="inline-flex items-center rounded-xl bg-emerald-500 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-600 transition-colors"
                                >
                                    Open my calendar
                                </Link>
                            )}
                        </>
                    ) : (
                        <Link
                            to="/login"
                            className="inline-flex items-center rounded-xl bg-slate-800 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-slate-700 transition-colors"
                        >
                            Get your free booking page
                        </Link>
                    )}
                </div>
            </section>

            <PublicCalendarsSection calendars={calendars} />
        </div>
    );
}