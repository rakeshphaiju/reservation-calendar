import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/header/Footer';
import { authService } from '../services/authService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUserPlus,
    faCalendarCheck,
    faShareNodes,
} from '@fortawesome/free-solid-svg-icons';

const STEPS = [
    {
        number: '1',
        icon: faUserPlus,
        title: 'Create Your Account',
        desc: 'Sign up in seconds — no credit card required. Set up your profile and you are ready to go.',
    },
    {
        number: '2',
        icon: faCalendarCheck,
        title: 'Customize Availability',
        desc: 'Define your working hours, block out breaks, and set buffer times between appointments.',
    },
    {
        number: '3',
        icon: faShareNodes,
        title: 'Share Your Booking Link',
        desc: 'Send your personal link to clients, share it in your social media or your website. They pick a slot, you get notified — it is that simple.',
    },
];

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
                                className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700! shadow-sm transition-colors hover:bg-slate-50"
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

            {/* ── How It Works ── */}
            <section className="mb-8 mt-8 py-20 px-6 bg-linear-to-tr from-white to-slate-200">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-900">
                            Up and Running in 3 Steps
                        </h2>
                        <p className="text-slate-500 mt-3 text-base">
                            From signup to accepting bookings in minutes.
                        </p>
                    </div>

                    <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Connector line — md+ only */}
                        <div
                            className="hidden md:block absolute top-9 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-slate-200"
                            aria-hidden="true"
                        />

                        {STEPS.map(({ number, icon, title, desc }) => (
                            <div key={number} className="flex flex-col items-center text-center gap-4">
                                {/* Icon bubble */}
                                <div className="relative z-10 flex items-center justify-center w-18 h-18 rounded-2xl bg-white border border-slate-200 shadow-sm text-emerald-700">
                                    <FontAwesomeIcon icon={icon} className="text-2xl" />
                                    {/* Step badge */}
                                    <span className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 rounded-full bg-emerald-700 text-white text-[10px] font-bold leading-none">
                                        {number}
                                    </span>
                                </div>

                                <div>
                                    <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed max-w-[22ch] mx-auto">
                                        {desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section className="py-20 px-6bg-linear-to-tr from-emerald-50">
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
                            className="rounded-2xl border border-slate-100 bg-white p-8 flex flex-col items-center text-center gap-4 hover:shadow-md transition-shadow"
                        >
                            <span className="text-4xl">{icon}</span>
                            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            <Footer />
        </div>
    );
}