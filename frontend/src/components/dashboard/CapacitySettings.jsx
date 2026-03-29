import React from 'react';
import PropTypes from 'prop-types';
import Input from '../form/Input';
import Button from '../form/Button';


export default function CapacitySettings({ capacity, onChange, onSave, saving, feedback }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <Input
                name="slot-capacity"
                title="Slot capacity"
                inputtype="number"
                value={capacity}
                handlechange={onChange}
                placeholder="Enter capacity (1-100)"
            />
            <p className="mt-1 text-sm text-slate-500">
                Set how many reservations are allowed in each time slot.
            </p>
            <div className="mt-4 flex items-center justify-between gap-4">
                {feedback?.message ? (
                    <p className={`text-sm ${feedback.type === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {feedback.message}
                    </p>
                ) : (
                    <span />
                )}
                <Button onClick={onSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                </Button>
            </div>
        </div>
    );
}


CapacitySettings.propTypes = {
    capacity: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    saving: PropTypes.bool.isRequired,
    feedback: PropTypes.shape({
        type: PropTypes.string,
        message: PropTypes.string,
    }).isRequired,
};