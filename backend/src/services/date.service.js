/**
 * Date helpers shared by attendance, leave and payroll logic.
 */
const dayjs = require('dayjs');

/** Normalize any date to midnight (start of day) for day-keyed records. */
function startOfDay(date) {
  return dayjs(date).startOf('day').toDate();
}

/** Count working days between two dates (inclusive), excluding weekends + holidays. */
function countWorkingDays(start, end, workingDays = [1, 2, 3, 4, 5], holidayDates = []) {
  const holidaySet = new Set(holidayDates.map((d) => dayjs(d).format('YYYY-MM-DD')));
  let count = 0;
  let cursor = dayjs(start).startOf('day');
  const last = dayjs(end).startOf('day');
  while (cursor.isBefore(last) || cursor.isSame(last)) {
    const dow = cursor.day();
    const key = cursor.format('YYYY-MM-DD');
    if (workingDays.includes(dow) && !holidaySet.has(key)) count += 1;
    cursor = cursor.add(1, 'day');
  }
  return count;
}

/** Number of calendar days in a given month/year. */
function daysInMonth(month, year) {
  return dayjs(`${year}-${String(month).padStart(2, '0')}-01`).daysInMonth();
}

module.exports = { startOfDay, countWorkingDays, daysInMonth };
