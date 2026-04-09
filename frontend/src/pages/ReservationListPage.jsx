// src/pages/ReservationListPage.jsx
import React, { useEffect, useState } from 'react';
import ReservationList from '../components/dashboard/ReservationList';
import { reservationService } from '../services/api';

export default function ReservationListPage() {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        async function loadReservations() {
            try {
                const result = await reservationService.getAll();

                const normalizedReservations = Array.isArray(result)
                    ? result
                    : Array.isArray(result?.reservations)
                        ? result.reservations
                        : Array.isArray(result?.data)
                            ? result.data
                            : [];

                if (active) setReservations(normalizedReservations);
            } finally {
                if (active) setLoading(false);
            }
        }

        loadReservations();

        return () => {
            active = false;
        };
    }, []);

    const handleDelete = async (reservationId) => {
        if (!window.confirm('Are you sure you want to delete this reservation?')) return;
        try {
            await reservationService.delete(reservationId);
            setReservations((current) =>
                Array.isArray(current)
                    ? current.filter((item) => item.id !== reservationId)
                    : []
            );
        } catch {
            alert('Failed to delete reservation');
        }

    };

    return (
        <div>
            {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                    Loading reservations...
                </div>
            ) : (
                <ReservationList
                    reservations={reservations}
                    onDelete={handleDelete}
                />
            )}
        </div >
    );
}