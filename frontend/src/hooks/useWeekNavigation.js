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

const buildDatesForWeek = (weekStart, bookableDays, dateTimeSlots, maxWeeks) => {
    const maxDate = moment().add(maxWeeks, 'weeks').endOf('day');
    const weekEnd = weekStart.clone().endOf('isoWeek');
    const dates = new Set();

    bookableDays.forEach((day) => {
        const isoWeekday = WEEKDAY_TO_ISO[day];
        if (!isoWeekday) return;

        const date = weekStart.clone().isoWeekday(isoWeekday);
        if (!date.isAfter(maxDate, 'day')) {
            dates.add(date.format('YYYY-MM-DD'));
        }
    });

    Object.keys(dateTimeSlots || {}).forEach((dateKey) => {
        const date = moment(dateKey, 'YYYY-MM-DD', true);
        if (!date.isValid()) return;
        if (date.isBetween(weekStart, weekEnd, 'day', '[]') && !date.isAfter(maxDate, 'day')) {
            dates.add(dateKey);
        }
    });

    return Array.from(dates).sort((left, right) => moment(left).valueOf() - moment(right).valueOf());
};

export const useWeekNavigation = (bookableDays, maxWeeks = 4, dateTimeSlots = {}) => {
    const [startDate, setStartDate] = useState(moment().startOf('isoWeek'));

    const dates = useMemo(
        () => buildDatesForWeek(startDate, bookableDays, dateTimeSlots, maxWeeks),
        [startDate, bookableDays, dateTimeSlots, maxWeeks]
    );

    const isPreviousWeekDisabled = useMemo(() => {
        const prevWeekStart = startDate.clone().subtract(1, 'week').startOf('isoWeek');
        const prevWeekDates = buildDatesForWeek(prevWeekStart, bookableDays, dateTimeSlots, maxWeeks);
        return !prevWeekDates.some((day) => moment(day, 'YYYY-MM-DD').isAfter(moment(), 'day'));
    }, [startDate, bookableDays, dateTimeSlots, maxWeeks]);

    const isTodayDisabled = useMemo(() => {
        return startDate.isSame(moment().startOf('isoWeek'), 'day');
    }, [startDate]);

    const isNextWeekDisabled = useMemo(() => {
        const nextWeekStart = startDate.clone().add(1, 'week').startOf('isoWeek');
        const nextWeekDates = buildDatesForWeek(nextWeekStart, bookableDays, dateTimeSlots, maxWeeks);
        return nextWeekDates.length === 0;
    }, [startDate, bookableDays, dateTimeSlots, maxWeeks]);

    const handlePreviousWeek = () => {
        if (isPreviousWeekDisabled) return;
        setStartDate((current) => current.clone().subtract(1, 'week').startOf('isoWeek'));
    };

    const handleToday = () => {
        setStartDate(moment().startOf('isoWeek'));
    };

    const handleNextWeek = () => {
        if (isNextWeekDisabled) return;
        setStartDate((current) => current.clone().add(1, 'week').startOf('isoWeek'));
    };

    const isPastOrToday = (day, time) => {
        const startTime = time.split('-')[0];
        const slotStart = moment(`${day} ${startTime}`, 'YYYY-MM-DD HH:mm');
        return slotStart.isSameOrBefore(moment());
    };

    const getEditableTimeSlots = (day, dayTimeSlots, exactDateTimeSlots = {}) => {
        const weekday = moment(day).format('dddd');
        const timeSlots = exactDateTimeSlots?.[day]?.length
            ? exactDateTimeSlots[day]
            : (dayTimeSlots?.[weekday] || []);
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
