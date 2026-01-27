import { format, startOfMonth, subMonths } from 'date-fns';
import { computed, type Ref, ref } from 'vue';

export interface MonthOption {
  id: string;
  label: string;
}

export interface UseMonthPickerOptions {
  /** Initial year (defaults to current year) */
  initialYear?: number;
  /** Initial month (1-12, defaults to current month) */
  initialMonth?: number;
  /** Number of months to show in picker (defaults to 12) */
  monthCount?: number;
}

export interface UseMonthPickerReturn {
  /** Current year (reactive) */
  year: Ref<number>;
  /** Current month 1-12 (reactive) */
  month: Ref<number>;
  /** Options for month picker dropdown */
  monthOptions: Ref<MonthOption[]>;
  /** Currently selected month option (for v-model binding) */
  selectedMonth: Ref<MonthOption>;
  /** Formatted month title (e.g., "Jan 2026") */
  monthTitle: Ref<string>;
}

/**
 * Composable for managing month picker state.
 *
 * Provides reactive year/month refs, dropdown options for the last N months,
 * and formatted display strings.
 *
 * @example
 * ```ts
 * const { year, month, selectedMonth, monthOptions, monthTitle } = useMonthPicker({
 *   initialYear: 2026,
 *   initialMonth: 1,
 * });
 * ```
 */
export const useMonthPicker = (
  options: UseMonthPickerOptions = {},
): UseMonthPickerReturn => {
  const {
    initialYear = new Date().getFullYear(),
    initialMonth = new Date().getMonth() + 1,
    monthCount = 12,
  } = options;

  const year = ref(initialYear);
  const month = ref(initialMonth);

  // Month picker options - show current month + last (monthCount - 1) months
  const monthOptions = computed<MonthOption[]>(() => {
    const result: MonthOption[] = [];
    const now = new Date();
    const currentMonthStart = startOfMonth(now);

    for (let i = 0; i < monthCount; i++) {
      const monthDate = subMonths(currentMonthStart, i);
      result.push({
        id: `${monthDate.getFullYear()}-${monthDate.getMonth() + 1}`,
        label: format(monthDate, 'MMM yyyy'),
      });
    }

    return result;
  });

  // Current selection for dropdown - find the matching option object
  // Note: monthOptions always has items (from the loop above), so [0] is safe
  const selectedMonth = computed<MonthOption>({
    get: (): MonthOption => {
      const options = monthOptions.value;
      const id = `${year.value}-${month.value}`;
      const found = options.find((opt) => opt.id === id);
      // Fallback to first option (always exists since monthCount >= 1)
      return found ?? options[0] ?? { id: '', label: '' };
    },
    set: (option: MonthOption | undefined) => {
      if (!option) return;
      const [newYear, newMonth] = option.id.split('-').map(Number);
      if (newYear && newMonth) {
        year.value = newYear;
        month.value = newMonth;
      }
    },
  });

  // Formatted month title for display
  const monthTitle = computed(() => {
    const date = new Date(year.value, month.value - 1, 1);
    return format(date, 'MMM yyyy');
  });

  return {
    year,
    month,
    monthOptions,
    selectedMonth,
    monthTitle,
  };
};
