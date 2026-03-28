import React from 'react';
import PropTypes from 'prop-types';
import Button from "../form/Button";


export default function DeleteAccountSection({ onDelete, deleting }) {
    return (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h3 className="text-xl font-bold text-rose-900">Delete account</h3>
                    <p className="mt-1 text-sm text-rose-700">
                        This removes your calendar owner account and permanently deletes all reservations.
                    </p>
                </div>
                <Button variant="danger" onClick={onDelete} disabled={deleting} className="px-5 py-2.5">
                    {deleting ? 'Deleting...' : 'Delete account'}
                </Button>
            </div>
        </section>
    );
}


DeleteAccountSection.propTypes = {
    onDelete: PropTypes.func.isRequired,
    deleting: PropTypes.bool.isRequired,
};