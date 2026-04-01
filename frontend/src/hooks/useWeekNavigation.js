// hooks/useWeekNavigation.js
import { useState, useMemo } from 'react';
import moment from 'moment';

const WEEKDAY_TO_ISO = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7,
};

export const useWeekNavigation = (bookableDays, maxWeeks = 4) => {
    const [startDate, setStartDate] = useState(moment().startOf('isoWeek'));

    const getUpcomingDates = useMemo(() => {
        return () => bookableDays.map((day) =>
            startDate.clone().isoWeekday(WEEKDAY_TO_ISO[day]).format('YYYY-MM-DD')
        );
    }, [startDate, bookableDays]);

    const dates = useMemo(() => getUpcomingDates(), [getUpcomingDates]);

    // Check if previous week button should be disabled
    const isPreviousWeekDisabled = useMemo(() => {
        const prevMonday = startDate.clone().subtract(1, 'week').isoWeekday(1);
        const prevLastBookableDay = prevMonday.clone().isoWeekday(
            Math.max(...bookableDays.map((day) => WEEKDAY_TO_ISO[day]))
        );
        return prevLastBookableDay.isSameOrBefore(moment(), 'day');
    }, [startDate, bookableDays]);

    // Check if Today button should be disabled
    const isTodayDisabled = useMemo(() => {
        return startDate.isSame(moment().startOf('isoWeek'), 'day');
    }, [startDate]);

    // Check if next week button should be disabled
    const isNextWeekDisabled = useMemo(() => {
        const maxDate = moment().add(maxWeeks, 'weeks');
        const nextMonday = startDate.clone().add(1, 'week').isoWeekday(1);
        const nextFirstBookableDay = nextMonday.clone().isoWeekday(
            Math.min(...bookableDays.map((day) => WEEKDAY_TO_ISO[day]))
        );
        return nextFirstBookableDay.isAfter(maxDate, 'day');
    }, [startDate, bookableDays, maxWeeks]);

    const handlePreviousWeek = () => {
        if (isPreviousWeekDisabled) return;
        const prevMonday = startDate.clone().subtract(1, 'week').isoWeekday(1);
        setStartDate(prevMonday);
    };

    const handleToday = () => {
        setStartDate(moment().startOf('isoWeek'));
    };

    const handleNextWeek = () => {
        if (isNextWeekDisabled) return;
        const nextMonday = startDate.clone().add(1, 'week').isoWeekday(1);
        setStartDate(nextMonday);
    };

    const isPastOrToday = (day, time) => {
        const startTime = time.split('-')[0];
        const slotStart = moment(`${day} ${startTime}`, 'YYYY-MM-DD HH:mm');
        return slotStart.isSameOrBefore(moment());
    };

    const getEditableTimeSlots = (day, dayTimeSlots) => {
        const weekday = moment(day).format('dddd');
        const timeSlots = dayTimeSlots?.[weekday] || [];
        return timeSlots.filter((time) => !isPastOrToday(day, time));
    };

    return {
        startDate,
        dates,
        handlePreviousWeek,
        handleToday,
        handleNextWeek,
        isPreviousWeekDisabled,
        isNextWeekDisabled,
        isTodayDisabled,
        isPastOrToday,
        getEditableTimeSlots,
    };
};
