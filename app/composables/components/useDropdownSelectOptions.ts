import type { ComputedRef, Ref } from 'vue';
import { computed } from 'vue';

export interface DropdownOptionValue<T = string | number> {
  value: T;
  label?: string;
  icon?: string;
}

export interface DropdownOption<T = string | number> {
  value: T | DropdownOptionValue<T>[]; // Single value or array of value objects
  label?: string; // Fallback label for the option group
  icon?: string; // Fallback icon for the option group
}

interface DropdownSelectOptions<T> {
  selectedLabel: ComputedRef<string | undefined>;
  selectedIcon: ComputedRef<string | undefined>;
  dropdownItems: ComputedRef<unknown[][]>;
  getNextValue: (option: DropdownOption<T>) => T;
}

export function useDropdownSelectOptions<T extends string | number>(
  options: Ref<DropdownOption<T>[]>,
  modelValue: Ref<T>,
  label?: string,
): DropdownSelectOptions<T> {
  // Normalize option values to a consistent array format
  const normalizeValues = (
    option: DropdownOption<T>,
  ): DropdownOptionValue<T>[] => {
    if (Array.isArray(option.value)) {
      return option.value as DropdownOptionValue<T>[];
    }
    return [
      { value: option.value as T, label: option.label, icon: option.icon },
    ];
  };

  // Check if an option contains the given value
  const optionContainsValue = (
    option: DropdownOption<T>,
    value: T,
  ): boolean => {
    const values = normalizeValues(option);
    return values.some((v) => v.value === value);
  };

  // Get the next value in a cycle when clicking an option
  const getNextValue = (option: DropdownOption<T>): T => {
    const values = normalizeValues(option);

    if (values.length === 1 && values[0]) {
      return values[0].value;
    }

    const currentIndex = values.findIndex((v) => v.value === modelValue.value);
    if (currentIndex === -1 && values[0]) {
      return values[0].value;
    }

    const nextIndex = (currentIndex + 1) % values.length;
    const nextValue = values[nextIndex];
    if (!nextValue) {
      throw new Error('Invalid cycling state');
    }
    return nextValue.value;
  };

  // Get direction icon for two-value cycling options (up/down arrows)
  const getDirectionIcon = (option: DropdownOption<T>): string | undefined => {
    const values = normalizeValues(option);

    if (values.length !== 2) return undefined;

    const currentIndex = values.findIndex((v) => v.value === modelValue.value);
    if (currentIndex === -1) return undefined;

    return currentIndex === 0
      ? 'i-heroicons-arrow-up'
      : 'i-heroicons-arrow-down';
  };

  // Get the label to display in the button for the currently selected value
  const selectedLabel = computed(() => {
    const currentVal = modelValue.value;

    for (const option of options.value) {
      if (!optionContainsValue(option, currentVal)) continue;

      const values = normalizeValues(option);
      const currentValue = values.find((v) => v.value === currentVal);

      if (currentValue) {
        return currentValue.label || option.label || String(currentVal);
      }

      return option.label || String(currentVal);
    }

    return undefined;
  });

  // Get the icon to display in the button for the currently selected value
  const selectedIcon = computed(() => {
    const currentVal = modelValue.value;

    for (const option of options.value) {
      if (!optionContainsValue(option, currentVal)) continue;

      const values = normalizeValues(option);
      const currentValue = values.find((v) => v.value === currentVal);

      if (currentValue) {
        return currentValue.icon || option.icon;
      }

      return option.icon;
    }

    return undefined;
  });

  // Generate dropdown menu items
  const dropdownItems = computed(() => {
    const items: unknown[][] = [];

    if (label) {
      items.push([
        {
          type: 'label',
          label,
        },
      ]);
    }

    items.push(
      options.value.map((option) => {
        const isActive = optionContainsValue(option, modelValue.value);
        const values = normalizeValues(option);
        const firstValue = values[0];

        if (!firstValue) {
          throw new Error('Option must have at least one value');
        }

        // Determine the label and icon to show in the menu item
        let menuLabel: string;
        let menuIcon: string | undefined;

        if (isActive) {
          // For active options, show the current value's label/icon
          const currentValue = values.find((v) => v.value === modelValue.value);
          if (currentValue) {
            menuLabel =
              currentValue.label || option.label || String(currentValue.value);
            menuIcon = currentValue.icon || option.icon;
          } else {
            menuLabel = option.label || String(modelValue.value);
            menuIcon = option.icon;
          }
        } else {
          // For inactive options, show the first value's label/icon
          menuLabel =
            option.label || firstValue.label || String(firstValue.value);
          menuIcon = firstValue.icon || option.icon;
        }

        return {
          label: menuLabel,
          icon: menuIcon,
          trailingIcon: getDirectionIcon(option),
          active: isActive,
          color: isActive ? 'primary' : 'neutral',
          onSelect: () => {
            modelValue.value = getNextValue(option);
          },
        };
      }),
    );

    return items;
  });

  return {
    selectedLabel,
    selectedIcon,
    dropdownItems,
    getNextValue,
  };
}
