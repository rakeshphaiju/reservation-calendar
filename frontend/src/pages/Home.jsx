import React from 'react';
import { Link } from 'react-router-dom';

import { authService } from '../services/auth';

export default function Home() {
    const [currentUser, setCurrentUser] = React.useState(authService.getUser());

    React.useEffect(() => {
        const unsubscribe = authService.subscribe((user) => setCurrentUser(user));
        return unsubscribe;
    }, []);

    return (
        <div className="space-y-10 py-8">
            <section className="text-center">
                <h1 className="text-4xl font-bold tracking-tight text-slate-800 sm:text-5xl">
                    Booking Nest
                </h1>

                <p className="mt-4 text-xl font-bold tracking-tight text-slate-800 sm:text-xl">
                    &ldquo;Create your own scheduling calendar.&rdquo;
                </p>

                <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
                    Manage a separate scheduling calendar and share a unique scheduling link.
                </p>

                <div className="mt-10 flex flex-wrap justify-center gap-4">
                    {currentUser ? (
                        <>
                            <Link
                                to="/dashboard"
                                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                            >
                                Open owner dashboard
                            </Link>

                            {currentUser.calendar_created && (
                                <Link
                                    to={`/calendar/${currentUser.calendar_slug}`}
                                    className="inline-flex items-center rounded-xl bg-emerald-500 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
                                >
                                    Open my calendar
                                </Link>
                            )}
                        </>
                    ) : (
                        <Link
                            to="/login"
                            className="inline-flex items-center rounded-xl bg-slate-800 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-slate-700"
                        >
                            Get your free scheduling calendar
                        </Link>
                    )}
                </div>
            </section>
        </div>
    );
}