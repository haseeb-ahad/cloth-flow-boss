import { useMemo } from "react";
import { useTimezone } from "@/contexts/TimezoneContext";

export type DateFilterValue = 
  | "all"
  | "today" 
  | "yesterday" 
  | "1week" 
  | "1month" 
  | "1year" 
  | "grand" 
  | "custom"
  | "7days"
  | "30days"
  | "90days";

export interface DateRange {
  start: Date;
  end: Date;
}

interface DateRangeOptions {
  dateFilter: DateFilterValue;
  startDate?: Date;
  endDate?: Date;
  timezone?: string;
}

/**
 * Get current date parts in a specific timezone
 */
export function getDatePartsInTimezone(date: Date, tz: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  return { year, month, day };
}

/**
 * Get timezone offset in milliseconds between UTC and target timezone
 */
export function getTimezoneOffsetMs(tz: string): number {
  const now = new Date();
  const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(now.toLocaleString('en-US', { timeZone: tz }));
  return tzDate.getTime() - utcDate.getTime();
}

/**
 * Create a date range in UTC from local timezone dates
 * Start: startDay at 00:00:00 in local timezone
 * End: endDay at 23:59:59.999 in local timezone
 */
export function createDateRangeUTC(
  startYear: number,
  startMonth: number,
  startDay: number,
  endYear: number,
  endMonth: number,
  endDay: number,
  tzOffset: number
): DateRange {
  const startLocal = new Date(startYear, startMonth, startDay, 0, 0, 0, 0);
  const endLocal = new Date(endYear, endMonth, endDay, 23, 59, 59, 999);
  return {
    start: new Date(startLocal.getTime() - tzOffset),
    end: new Date(endLocal.getTime() - tzOffset)
  };
}

/**
 * Calculate date range based on filter value with proper timezone handling
 * 
 * Filter Logic:
 * - today: Current date 00:00:00 to 23:59:59 in user's timezone
 * - yesterday: Previous date 00:00:00 to 23:59:59 in user's timezone
 * - 1week: From Monday of current week to today (current week only)
 * - 1month: From 1st of current month to today (current month only)
 * - 1year: From Jan 1st of current year to today (current year only)
 * - grand/all: Epoch start to today end
 * - custom: User-specified start and end dates
 * - 7days/30days/90days: Rolling N days back from today (legacy support)
 */
export function calculateDateRange(options: DateRangeOptions): DateRange {
  const { dateFilter, startDate, endDate, timezone = 'Asia/Karachi' } = options;
  
  const now = new Date();
  const todayParts = getDatePartsInTimezone(now, timezone);
  const tzOffset = getTimezoneOffsetMs(timezone);

  const createRange = (
    startYear: number,
    startMonth: number,
    startDay: number,
    endYear: number,
    endMonth: number,
    endDay: number
  ) => createDateRangeUTC(startYear, startMonth, startDay, endYear, endMonth, endDay, tzOffset);

  switch (dateFilter) {
    case "today":
      // Today: 00:00:00 to 23:59:59 in user's timezone
      return createRange(
        todayParts.year, todayParts.month, todayParts.day,
        todayParts.year, todayParts.month, todayParts.day
      );

    case "yesterday": {
      // Yesterday: Previous day 00:00:00 to 23:59:59
      const yesterday = new Date(todayParts.year, todayParts.month, todayParts.day - 1);
      return createRange(
        yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(),
        yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()
      );
    }

    case "1week": {
      // Current week: From Monday of current week to today
      const todayDate = new Date(todayParts.year, todayParts.month, todayParts.day);
      const dayOfWeek = todayDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // If Sunday, go back 6 days
      const weekStart = new Date(todayParts.year, todayParts.month, todayParts.day - daysFromMonday);
      return createRange(
        weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate(),
        todayParts.year, todayParts.month, todayParts.day
      );
    }

    case "1month":
      // Current month: From 1st of current month to today
      return createRange(
        todayParts.year, todayParts.month, 1,
        todayParts.year, todayParts.month, todayParts.day
      );

    case "1year":
      // Current year: From January 1st to today
      return createRange(
        todayParts.year, 0, 1,
        todayParts.year, todayParts.month, todayParts.day
      );

    case "grand":
    case "all":
      // All time: From epoch to today end
      return {
        start: new Date(0),
        end: new Date(new Date(todayParts.year, todayParts.month, todayParts.day, 23, 59, 59, 999).getTime() - tzOffset)
      };

    case "7days": {
      // Rolling 7 days: 7 days ago to today (for legacy SalesReport compatibility)
      const sevenDaysAgo = new Date(todayParts.year, todayParts.month, todayParts.day - 6);
      return createRange(
        sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate(),
        todayParts.year, todayParts.month, todayParts.day
      );
    }

    case "30days": {
      // Rolling 30 days: 30 days ago to today (for legacy SalesReport compatibility)
      const thirtyDaysAgo = new Date(todayParts.year, todayParts.month, todayParts.day - 29);
      return createRange(
        thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate(),
        todayParts.year, todayParts.month, todayParts.day
      );
    }

    case "90days": {
      // Rolling 90 days: 90 days ago to today (for legacy SalesReport compatibility)
      const ninetyDaysAgo = new Date(todayParts.year, todayParts.month, todayParts.day - 89);
      return createRange(
        ninetyDaysAgo.getFullYear(), ninetyDaysAgo.getMonth(), ninetyDaysAgo.getDate(),
        todayParts.year, todayParts.month, todayParts.day
      );
    }

    case "custom":
      // Custom: User-specified dates
      if (startDate && endDate) {
        return createRange(
          startDate.getFullYear(), startDate.getMonth(), startDate.getDate(),
          endDate.getFullYear(), endDate.getMonth(), endDate.getDate()
        );
      } else if (startDate) {
        return createRange(
          startDate.getFullYear(), startDate.getMonth(), startDate.getDate(),
          todayParts.year, todayParts.month, todayParts.day
        );
      } else if (endDate) {
        return {
          start: new Date(0),
          end: new Date(new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999).getTime() - tzOffset)
        };
      }
      // Default to today if no dates specified
      return createRange(
        todayParts.year, todayParts.month, todayParts.day,
        todayParts.year, todayParts.month, todayParts.day
      );

    default:
      // Default to today
      return createRange(
        todayParts.year, todayParts.month, todayParts.day,
        todayParts.year, todayParts.month, todayParts.day
      );
  }
}

/**
 * Get today's date range in user's timezone (for todaySales metric)
 */
export function getTodayDateRange(timezone: string = 'Asia/Karachi'): DateRange {
  const now = new Date();
  const todayParts = getDatePartsInTimezone(now, timezone);
  const tzOffset = getTimezoneOffsetMs(timezone);
  
  return createDateRangeUTC(
    todayParts.year, todayParts.month, todayParts.day,
    todayParts.year, todayParts.month, todayParts.day,
    tzOffset
  );
}

/**
 * Hook for using date range filter with timezone context
 */
export function useDateRangeFilter(
  dateFilter: DateFilterValue,
  startDate?: Date,
  endDate?: Date
) {
  const { timezone } = useTimezone();
  const tz = timezone || 'Asia/Karachi';

  const dateRange = useMemo(() => {
    return calculateDateRange({
      dateFilter,
      startDate,
      endDate,
      timezone: tz
    });
  }, [dateFilter, startDate, endDate, tz]);

  const todayRange = useMemo(() => {
    return getTodayDateRange(tz);
  }, [tz]);

  return {
    dateRange,
    todayRange,
    timezone: tz
  };
}

export default useDateRangeFilter;
