import React from 'react';
import PropTypes from 'prop-types';
import Button from './form/Button';

const SlotButton = ({
    day,
    time,
    mobile = false,
    isPastOrToday,
    isFullyBooked,
    getSpotsLeft,
    showForm,
    slotCapacity,
}) => {
    const past = isPastOrToday(day, time);
    const fullyBooked = isFullyBooked(day, time);
    const disabled = past || fullyBooked;
    const spotsLeft = getSpotsLeft(day, time);

    const statusLabel = past
        ? '-'
        : fullyBooked
            ? 'Fully booked'
            : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`;

    return (
        <Button
            disabled={disabled}
            onClick={() => !disabled && showForm(day, time)}
            className={mobile
                ? `px-3 py-2 text-left border ${disabled ? 'border-slate-200' : 'border-emerald-600'}`
                : `h-20 w-full`
            }
        >
            {mobile ? (
                <>
                    <span className="block font-medium">{time}</span>
                    <span className="block text-xs opacity-90">{statusLabel}</span>
                </>
            ) : (
                <div className="flex flex-col items-center gap-1">
                    <span>{past ? '-' : fullyBooked ? 'Full' : 'Book'}</span>
                    {!disabled && (
                        <span className="text-xs opacity-80">
                            {spotsLeft}/{slotCapacity} left
                        </span>
                    )}
                </div>
            )}
        </Button>
    );
};

SlotButton.propTypes = {
    day: PropTypes.string.isRequired,
    time: PropTypes.string.isRequired,
    mobile: PropTypes.bool,
    isPastOrToday: PropTypes.func.isRequired,
    isFullyBooked: PropTypes.func.isRequired,
    getSpotsLeft: PropTypes.func.isRequired,
    showForm: PropTypes.func.isRequired,
    slotCapacity: PropTypes.number.isRequired,
};

export default SlotButton;
