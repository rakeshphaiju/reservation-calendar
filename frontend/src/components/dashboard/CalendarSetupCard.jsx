import React from 'react';
import PropTypes from 'prop-types';
import Button from "../form/Button";


export default function CalendarSetupCard({ onCreateCalendar, creating }) {
    return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="text-base font-semibold text-amber-900">Create your calendar</h3>
            <p className="mt-1 text-sm text-amber-800">
                Once your booking rules look right, publish the calendar here.
            </p>
            <div className="mt-4 flex justify-end">
                <Button onClick={onCreateCalendar} disabled={creating}>
                    {creating ? 'Creating...' : 'Create calendar'}
                </Button>
            </div>
        </div>
    );
}


CalendarSetupCard.propTypes = {
    onCreateCalendar: PropTypes.func.isRequired,
    creating: PropTypes.bool.isRequired,
};