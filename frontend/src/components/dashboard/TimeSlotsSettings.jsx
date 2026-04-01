import React from 'react';
import PropTypes from 'prop-types';
import Button from '../form/Button';


export default function TimeSlotsSettings({
    bookableDays,
    dayTimeSlotsText,
    onChange,
    onSave,
    saving,
    feedback,
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-sm font-semibold text-slate-800">Bookable time slots</label>
            <p className="mt-1 text-sm text-slate-500">
                Add one time slot per line in <code>HH:MM-HH:MM</code> format. You can use different hours for each weekday.
            </p>
            <div className="mt-4 space-y-4">
                {bookableDays.map((day) => (
                    <div key={day}>
                        <label className="block text-sm font-semibold text-slate-700" htmlFor={`time-slots-${day}`}>
                            {day}
                        </label>
                        <textarea
                            id={`time-slots-${day}`}
                            name={day}
                            rows={4}
                            value={dayTimeSlotsText[day] || ''}
                            onChange={(event) => onChange(day, event.target.value)}
                            className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>
                ))}
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
                {feedback?.message ? (
                    <p className={`text-sm ${feedback.type === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {feedback.message}
                    </p>
                ) : (
                    <span />
                )}
                <Button onClick={onSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save time slots'}
                </Button>
            </div>
        </div>
    );
}


TimeSlotsSettings.propTypes = {
    bookableDays: PropTypes.arrayOf(PropTypes.string).isRequired,
    dayTimeSlotsText: PropTypes.objectOf(PropTypes.string).isRequired,
    onChange: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    saving: PropTypes.bool.isRequired,
    feedback: PropTypes.shape({
        type: PropTypes.string,
        message: PropTypes.string,
    }).isRequired,
};
