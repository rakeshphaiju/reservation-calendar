import { useState, useEffect } from 'react';
import { reservationService } from '../services/api';

const DEFAULT_TIME_SLOTS = [
    '10:00-11:00',
    '11:00-12:00',
    '12:00-13:00',
    '13:00-14:00',
    '15:00-16:00',
    '16:00-17:00',
    '17:00-18:00',
];
const WEEKDAY_OPTIONS = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
];
const DEFAULT_BOOKABLE_DAYS = WEEKDAY_OPTIONS.slice(0, 5);

export const useReservation = (ownerSlug) => {
    const [slotCounts, setSlotCounts] = useState({});
    const [fullyBookedSlots, setFullyBookedSlots] = useState([]);
    const [slotCapacity, setSlotCapacity] = useState(5);
    const [maxWeeks, setMaxWeeks] = useState(4);
    const [timeSlots, setTimeSlots] = useState(DEFAULT_TIME_SLOTS);
    const [bookableDays, setBookableDays] = useState(DEFAULT_BOOKABLE_DAYS);
    const [calendarExists, setCalendarExists] = useState(true);
    const [calendarDescription, setCalendarDescription] = useState(null);
    const [calendarLocation, setCalendarLocation] = useState(null);

    const loadAvailability = () => {
        reservationService
            .getSlots(ownerSlug)
            .then((availability) => {
                const counts = {};
                const fullyBooked = [];
                const nextCapacity = availability.slot_capacity ?? 5;
                const nextMaxWeeks = availability.max_weeks ?? 4;
                const nextTimeSlots = availability.time_slots?.length ? availability.time_slots : DEFAULT_TIME_SLOTS;
                const nextBookableDays = availability.bookable_days?.length ? availability.bookable_days : DEFAULT_BOOKABLE_DAYS;

                availability.slots.forEach(({ day, time, count }) => {
                    if (!counts[day]) counts[day] = {};
                    counts[day][time] = count;
                    if (count >= nextCapacity) fullyBooked.push({ day, time });
                });

                setSlotCapacity(nextCapacity);
                setMaxWeeks(nextMaxWeeks);
                setTimeSlots(nextTimeSlots);
                setBookableDays(nextBookableDays);
                setCalendarDescription(availability.calendar_description ?? null);
                setCalendarLocation(availability.calendar_location ?? null);
                setSlotCounts(counts);
                setFullyBookedSlots(fullyBooked);
                setCalendarExists(true);
            })
            .catch((err) => {
                if (err?.response?.status === 404) {
                    setCalendarExists(false);
                    setSlotCapacity(5);
                    setMaxWeeks(4);
                    setTimeSlots(DEFAULT_TIME_SLOTS);
                    setBookableDays(DEFAULT_BOOKABLE_DAYS);
                    setCalendarDescription(null);
                    setCalendarLocation(null);
                    setSlotCounts({});
                    setFullyBookedSlots([]);
                } else {
                    console.log('Failed to load reserved slots');
                }
            });
    };

    useEffect(() => {
        loadAvailability();
    }, [ownerSlug]);

    const isFullyBooked = (day, time) =>
        fullyBookedSlots.some((s) => s.day === day && s.time === time);

    const getSlotCount = (day, time) => slotCounts?.[day]?.[time] ?? 0;

    const getSpotsLeft = (day, time) => {
        if (isFullyBooked(day, time)) return 0;
        return slotCapacity - getSlotCount(day, time);
    };

    const refreshAvailability = () => {
        loadAvailability();
    };

    return {
        slotCapacity,
        maxWeeks,
        timeSlots,
        bookableDays,
        calendarDescription,
        calendarLocation,
        calendarExists,
        isFullyBooked,
        getSpotsLeft,
        refreshAvailability,
    };
};
