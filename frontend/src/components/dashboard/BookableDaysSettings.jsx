import React from 'react';
import PropTypes from 'prop-types';
import Button from '../form/Button';
import Checkbox from '../form/Checkbox';


const BOOKABLE_DAY_OPTIONS = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday',
    'Friday', 'Saturday', 'Sunday',
];


export default function BookableDaysSettings({ bookableDays, onToggle, onSave, saving, feedback }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block text-sm font-semibold text-slate-800">Bookable days</label>
            <p className="mt-1 text-sm text-slate-500">
                Choose which weekdays appear on this calendar. You can leave all weekdays off if you only want to open specific dates.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {BOOKABLE_DAY_OPTIONS.map((day) => {
                    const checked = bookableDays.includes(day);
                    return (
                        <div
                            key={day}
                            className={`rounded-lg border p-3 transition ${checked ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'
                                }`}
                        >
                            <Checkbox label={day} checked={checked} onChange={() => onToggle(day)} />
                        </div>
                    );
                })}
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
                    {saving ? 'Saving…' : 'Save days'}
                </Button>
            </div>
        </div>
    );
}


BookableDaysSettings.propTypes = {
    bookableDays: PropTypes.arrayOf(PropTypes.string).isRequired,
    onToggle: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    saving: PropTypes.bool.isRequired,
    feedback: PropTypes.shape({
        type: PropTypes.string,
        message: PropTypes.string,
    }).isRequired,
};
