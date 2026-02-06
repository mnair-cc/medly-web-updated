"use client";

import { useState, useEffect, useMemo } from "react";
import moment from "moment-timezone";
import { getMockDateInUTC } from "../_utils/utils";

/**
 * Hook to get the current mock dates and period states.
 *
 * Use this hook in components that need to know what phase of the mocks
 * lifecycle we're in (registration, mocks period, results day, etc.).
 *
 * @returns {Object} Mock dates and period states
 * @returns {boolean} isReady - Whether the date values have stabilised
 * @returns {boolean} isAfterResultsDay - Whether we're past results day
 * @returns {boolean} isAfterMocksEnd - Whether we're past mocks end
 * @returns {boolean} isBeforeResultsDay - Whether we're before results day
 * @returns {boolean} isMocksPeriod - Whether we're in the mocks period (after start, before end)
 * @returns {boolean} isRegistrationOpen - Whether registration is open
 * @returns {Moment} resultsDay - The results day date
 * @returns {Moment} mocksEnd - The mocks end date
 * @returns {Moment} mocksStart - The mocks start date
 * @returns {Moment} registrationOpens - The registration opens date
 */
export function useMockDates() {
  const [isReady, setIsReady] = useState(false);
  const [checkCount, setCheckCount] = useState(0);

  // Small delay on mount to ensure date calculations are stable
  useEffect(() => {
    const timer = setTimeout(() => {
      setCheckCount((c) => c + 1);
      setIsReady(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Compute all date-based states
  const dateState = useMemo(() => {
    const now = moment().utc();
    const resultsDay = getMockDateInUTC("results_day");
    const mocksEnd = getMockDateInUTC("mocks_end");
    const mocksStart = getMockDateInUTC("mocks_start");
    const registrationOpens = getMockDateInUTC("registration_opens");

    return {
      // Boolean states
      isAfterResultsDay: now.isAfter(resultsDay),
      isAfterMocksEnd: now.isAfter(mocksEnd),
      isBeforeResultsDay: now.isBefore(resultsDay),
      isMocksPeriod: now.isAfter(mocksStart) && now.isBefore(mocksEnd),
      isRegistrationOpen: now.isAfter(registrationOpens),
      // Raw dates for display/formatting
      resultsDay,
      mocksEnd,
      mocksStart,
      registrationOpens,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkCount]);

  return {
    isReady,
    ...dateState,
  };
}

// Legacy alias for backwards compatibility
export const useMockScenario = useMockDates;
