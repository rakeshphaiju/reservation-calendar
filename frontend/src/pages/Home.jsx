import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/header/Footer';
import { authService } from '../services/authService';

// Replace with your actual screenshot asset
//import appScreenshot from '../assets/app-screenshot.png';

export default function Home() {
    const [currentUser, setCurrentUser] = React.useState(authService.getUser());

    React.useEffect(() => {
        const unsubscribe = authService.subscribe((user) => setCurrentUser(user));
        return unsubscribe;
    }, []);

    return (
        <div className="min-h-screen font-sans text-slate-800">

            {/* ── Hero ── */}
            <section className="text-center px-6 pt-16 pb-5 max-w-2xl mx-auto">
                <h1 className="text-3xl md:text-5xl font-bold text-slate-900 leading-tight mb-4">
                    Simplify Your Scheduling
                </h1>
                <p className="text-slate-500 text-lg mb-8">
                    The easy-to-use platform for managing appointments,{' '}
                    <br className="hidden md:block" />
                    bookings, and reservations.
                </p>

                <div className="flex flex-wrap justify-center gap-3">
                    {currentUser ? (
                        <>
                            <Link
                                to="/dashboard"
                                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold !text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                            >
                                Open owner dashboard
                            </Link>
                            {currentUser.calendar_created && (
                                <Link
                                    to={`/calendar/${currentUser.calendar_slug}`}
                                    className="inline-flex items-center rounded-xl bg-emerald-700 px-6 py-3 text-base font-semibold text-white! shadow-sm transition-colors hover:bg-emerald-800"
                                >
                                    Open my calendar
                                </Link>
                            )}
                        </>
                    ) : (
                        <Link
                            to="/login"
                            className="inline-flex items-center rounded-xl bg-emerald-700 px-6 py-3 text-base font-semibold text-white! shadow-sm transition-colors hover:bg-emerald-800"
                        >
                            Get Started
                        </Link>
                    )}
                </div>
            </section>

            {/* ── App Screenshot 
            <section className="px-6 max-w-4xl mx-auto pb-20">
                <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-200">
                    <img
                        src={appScreenshot}
                        alt="Booking Nest app screenshot"
                        className="w-full object-cover"
                    />
                </div>
            </section> ── */}

            {/* ── Features ── */}
            <section className="py-20 px-6">
                <div className="max-w-4xl mx-auto text-center mb-12">
                    <h2 className="text-3xl font-bold text-slate-900">
                        Streamline Your Booking Process
                    </h2>
                </div>
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        {
                            icon: '🗓️',
                            title: 'Easy Scheduling',
                            desc: 'Quickly set your availability and manage appointments.',
                        },
                        {
                            icon: '✅',
                            title: 'Simple Booking',
                            desc: 'Clients can easily view your schedule and book online.',
                        },
                        {
                            icon: '🔔',
                            title: 'Automated Reminders',
                            desc: 'Reduce no-shows with automated reminders and confirmations.',
                        },
                    ].map(({ icon, title, desc }) => (
                        <div
                            key={title}
                            className="rounded-2xl border border-slate-100 bg-slate-50 p-8 flex flex-col items-center text-center gap-4 hover:shadow-md transition-shadow"
                        >
                            <span className="text-4xl">{icon}</span>
                            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── CTA Banner 
            <section className="py-20 px-6 text-center">
                <h2 className="text-3xl font-bold text-slate-900 mb-3">
                    Start Free, Upgrade Anytime
                </h2>
                <p className="text-slate-500 mb-8">
                    Try Booking Nest for free. No credit card required.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    {currentUser ? (
                        <Link
                            to="/dashboard"
                            className="inline-flex items-center rounded-xl bg-emerald-700 px-7 py-3 text-base font-semibold text-white! shadow-sm transition-colors hover:bg-emerald-800"
                        >
                            Go to Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="inline-flex items-center rounded-xl bg-emerald-700 px-7 py-3 text-base font-semibold text-white! shadow-sm transition-colors hover:bg-emerald-800"
                            >
                                Get Started
                            </Link>
                        </>
                    )}
                </div>
            </section> ── */}

            <Footer />
        </div>
    );
}