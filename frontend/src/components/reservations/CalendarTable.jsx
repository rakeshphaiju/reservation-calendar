import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import SlotButton from '../SlotButton';

export const CalendarTable = ({ dates, times, getTimesForDay, slotProps }) => {
    return (
        <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="min-w-full border-collapse">
                <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Date</th>
                        {times.map((time, i) => (
                            <th key={i} className="px-3 py-3 text-center text-sm font-semibold text-slate-700 whitespace-nowrap">
                                {time}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {dates.map((day, index) => {
                        const dayTimes = getTimesForDay(day);
                        return (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 whitespace-nowrap">
                                {moment(day).format('dddd, MMMM D')}
                            </th>
                            {times.map((time) => {
                                if (!dayTimes.includes(time)) {
                                    return (
                                        <td key={`${day}-${time}`} className="px-2 py-2">
                                            <SlotButton day={day} time={time} unavailable {...slotProps} />
                                        </td>
                                    );
                                }

                                return (
                                    <td
                                        key={`${day}-${time}`}
                                        className={`px-2 py-2 ${slotProps.isFullyBooked(day, time) ? 'bg-red-50' : ''}`}
                                    >
                                        <SlotButton day={day} time={time} {...slotProps} />
                                    </td>
                                );
                            })}
                        </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

CalendarTable.propTypes = {
    dates: PropTypes.arrayOf(PropTypes.string).isRequired,
    times: PropTypes.arrayOf(PropTypes.string).isRequired,
    getTimesForDay: PropTypes.func.isRequired,
    slotProps: PropTypes.shape({
        isFullyBooked: PropTypes.func.isRequired,
        isPastOrToday: PropTypes.func.isRequired,
        getSpotsLeft: PropTypes.func.isRequired,
        showForm: PropTypes.func.isRequired,
        slotCapacity: PropTypes.number.isRequired,
    }).isRequired,
};

export default CalendarTable;
