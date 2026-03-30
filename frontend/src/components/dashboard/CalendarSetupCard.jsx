import React from 'react';
import PropTypes from 'prop-types';
import Button from "../form/Button";


export default function CalendarSetupCard({
    isPrivate,
    onCreateCalendar,
    onMakePrivate,
    creating,
    makingPrivate,
}) {
    return (
        <div className={`rounded-2xl p-4 ${isPrivate ? 'border border-amber-200 bg-amber-50' : 'border border-slate-200 bg-slate-50'}`}>
            <h3 className={`text-base font-semibold ${isPrivate ? 'text-amber-900' : 'text-slate-900'}`}>
                {isPrivate ? 'Create your calendar' : 'Calendar visibility'}
            </h3>
            <p className={`mt-1 text-sm ${isPrivate ? 'text-amber-800' : 'text-slate-700'}`}>
                {isPrivate
                    ? 'Once your booking rules look right, publish the calendar here.'
                    : 'This calendar is public right now. Set it back to private whenever you want to hide the booking page.'}
            </p>
            <div className="mt-4 flex justify-end gap-3">
                {isPrivate ? (
                    <Button onClick={onCreateCalendar} disabled={creating}>
                        {creating ? 'Creating...' : 'Create calendar'}
                    </Button>
                ) : (
                    <Button onClick={onMakePrivate} disabled={makingPrivate}>
                        {makingPrivate ? 'Saving...' : 'Make private'}
                    </Button>
                )}
            </div>
        </div>
    );
}


CalendarSetupCard.propTypes = {
    isPrivate: PropTypes.bool.isRequired,
    onCreateCalendar: PropTypes.func.isRequired,
    onMakePrivate: PropTypes.func.isRequired,
    creating: PropTypes.bool.isRequired,
    makingPrivate: PropTypes.bool.isRequired,
};
