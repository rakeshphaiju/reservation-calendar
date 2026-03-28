import React from 'react';
import PropTypes from 'prop-types';
import Input from "../form/Input";
import Button from "../form/Button";

export default function MaxWeeksSettings({ maxWeeks, onChange, onSave, saving }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Input
                name="max-weeks"
                title="Booking window"
                inputtype="number"
                value={maxWeeks}
                handlechange={onChange}
                placeholder="Enter weeks (1-52)"
            />
            <p className="mt-1 text-sm text-slate-500">
                Set how many weeks ahead people can navigate and book.
            </p>
            <div className="mt-4 flex justify-end">
                <Button onClick={onSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                </Button>
            </div>
        </div>
    );
}


MaxWeeksSettings.propTypes = {
    maxWeeks: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    saving: PropTypes.bool.isRequired,
};