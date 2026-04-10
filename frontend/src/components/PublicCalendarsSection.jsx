import React from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

export default function PublicCalendarsSection({ calendars = [] }) {
    const safeCalendars = Array.isArray(calendars)
        ? calendars
        : Array.isArray(calendars?.calendars)
            ? calendars.calendars
            : Array.isArray(calendars?.data)
                ? calendars.data
                : [];

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">Public calendars</h2>
                <p className="mt-1 text-sm text-slate-600">
                    Share any of these direct links so people can book the right calendar.
                </p>
            </div>

            {safeCalendars.length === 0 ? (
                <div className="rounded-xl bg-slate-50 px-4 py-10 text-center text-slate-500">
                    No public calendars yet. Register, customize your settings in the dashboard, then create your calendar.
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {safeCalendars.map((calendar) => (
                        <Link
                            key={calendar.calendar_slug}
                            to={`/calendar/${calendar.calendar_slug}`}
                            className="rounded-xl border border-slate-200 px-4 py-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                        >
                            <div className="font-semibold text-slate-800">{calendar.username}</div>
                            <div className="mt-1 text-sm text-slate-500">
                                /calendar/{calendar.calendar_slug}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </section>
    );
}

PublicCalendarsSection.propTypes = {
    calendars: PropTypes.oneOfType([
        PropTypes.array,
        PropTypes.shape({
            calendars: PropTypes.array,
            data: PropTypes.array,
        }),
    ]),
};