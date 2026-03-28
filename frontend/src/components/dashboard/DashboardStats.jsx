import React from 'react';
import PropTypes from 'prop-types';


export default function DashboardStats({ total, reservedSlots, upcoming }) {
    const stats = [
        { label: 'Total reservations', value: total },
        { label: 'Reserved slots', value: reservedSlots },
        { label: 'Upcoming reservations', value: upcoming },
    ];

    return (
        <section className="grid gap-4 md:grid-cols-3">
            {stats.map(({ label, value }) => (
                <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
                </article>
            ))}
        </section>
    );
}


DashboardStats.propTypes = {
    total: PropTypes.number.isRequired,
    reservedSlots: PropTypes.number.isRequired,
    upcoming: PropTypes.number.isRequired,
};