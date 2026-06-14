export function generateTimeSlots(start, end, duration = 60) {
  const slots = [];

  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  let current = new Date();
  current.setHours(startH, startM, 0, 0);

  const endTime = new Date();
  endTime.setHours(endH, endM, 0, 0);

  while (current < endTime) {
    const timeStr = current.toTimeString().slice(0, 5); // "HH:MM"
    slots.push(timeStr);

    current = new Date(current.getTime() + duration * 60000);
  }

  return slots;
}
