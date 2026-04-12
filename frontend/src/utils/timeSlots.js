export const compareTimeSlots = (left, right) => {
  const leftStart = left.split('-', 1)[0];
  const rightStart = right.split('-', 1)[0];
  return leftStart.localeCompare(rightStart);
};

export const sortTimeSlots = (slots) => [...slots].sort(compareTimeSlots);
