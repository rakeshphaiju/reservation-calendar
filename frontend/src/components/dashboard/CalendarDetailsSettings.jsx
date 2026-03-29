import React from 'react';
import PropTypes from 'prop-types';
import Button from '../form/Button';


export default function CalendarDetailsSettings({
  description,
  location,
  onDescriptionChange,
  onLocationChange,
  onSave,
  saving,
  feedback,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <label className="block text-sm font-semibold text-slate-800" htmlFor="calendar-description">
        Calendar description
      </label>
      <p className="mt-1 text-sm text-slate-500">
        Optional text that appears on your public calendar page.
      </p>
      <textarea
        id="calendar-description"
        name="calendar-description"
        rows={4}
        value={description}
        onChange={onDescriptionChange}
        placeholder="Add a short introduction, instructions, or what guests should expect."
        className="mt-4 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />

      <label className="mt-4 block text-sm font-semibold text-slate-800" htmlFor="calendar-location">
        Calendar location
      </label>
      <p className="mt-1 text-sm text-slate-500">
        Optional place, room, address, or meeting point shown in My Calendar.
      </p>
      <input
        id="calendar-location"
        name="calendar-location"
        type="text"
        value={location}
        onChange={onLocationChange}
        placeholder="Example: Helsinki office, 2nd floor"
        className="mt-4 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />

      <div className="mt-4 flex items-center justify-between gap-4">
        {feedback?.message ? (
          <p className={`text-sm ${feedback.type === 'error' ? 'text-rose-600' : 'text-emerald-700'}`}>
            {feedback.message}
          </p>
        ) : (
          <span />
        )}
        <Button onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save details'}
        </Button>
      </div>
    </div>
  );
}


CalendarDetailsSettings.propTypes = {
  description: PropTypes.string.isRequired,
  location: PropTypes.string.isRequired,
  onDescriptionChange: PropTypes.func.isRequired,
  onLocationChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  saving: PropTypes.bool.isRequired,
  feedback: PropTypes.shape({
    type: PropTypes.string,
    message: PropTypes.string,
  }).isRequired,
};