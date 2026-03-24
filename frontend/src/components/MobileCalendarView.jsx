import React from 'react';
import moment from 'moment';
import SlotButton from './SlotButton';

export const MobileCalendarView = ({ dates, times, slotProps }) => {
    return (
        <div className="space-y-5 md:hidden">
            {dates.map((day) => (
                <section key={day} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h3 className="mb-3 text-base font-semibold text-slate-800">
                        {moment(day).format('dddd, MMMM D')}
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {times.map((time) => (
                            <SlotButton key={`${day}-${time}`} day={day} time={time} mobile {...slotProps} />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
};