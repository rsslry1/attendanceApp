import { AttendanceStatus } from '@prisma/client';

/**
 * Calculate attendance status based on arrival time
 */
export function calculateAttendanceStatus(
  arrivalTime: Date,
  classStartTime: string,
  gracePeriodMinutes: number = 15
): AttendanceStatus {
  const arrivalDate = new Date(arrivalTime);
  const [hours, minutes] = classStartTime.split(':').map(Number);

  const classStart = new Date(arrivalDate);
  classStart.setHours(hours, minutes, 0, 0);

  // Calculate difference in minutes
  const diffMinutes = (arrivalDate.getTime() - classStart.getTime()) / (1000 * 60);

  if (diffMinutes <= gracePeriodMinutes) {
    return 'PRESENT';
  } else {
    return 'LATE';
  }
}

/**
 * Parse time string (HH:MM) to Date object with same date as reference
 */
export function parseTimeToDate(timeString: string, referenceDate: Date): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date(referenceDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Format time for display
 */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Get start and end of day for date filtering
 */
export function getDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Get start and end of week for date filtering
 */
export function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  const dayOfWeek = start.getDay();
  const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Get start and end of month for date filtering
 */
export function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setMonth(end.getMonth() + 1);
  end.setDate(0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Check if time is within time window
 */
export function isTimeWithinWindow(
  time: Date,
  windowStart: Date,
  windowEnd: Date
): boolean {
  return time >= windowStart && time <= windowEnd;
}

/**
 * Calculate attendance statistics
 */
export interface AttendanceStats {
  total: number;
  present: number;
  late: number;
  absent: number;
  percentage: number;
}

export function calculateAttendanceStats(
  present: number,
  late: number,
  absent: number
): AttendanceStats {
  const total = present + late + absent;
  const percentage = total > 0 ? ((present + late) / total) * 100 : 0;

  return {
    total,
    present,
    late,
    absent,
    percentage: Math.round(percentage * 10) / 10,
  };
}
