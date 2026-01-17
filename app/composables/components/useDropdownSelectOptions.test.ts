import { describe, expect, it } from 'vitest';
import { ref } from 'vue';
import {
  type DropdownOption,
  useDropdownSelectOptions,
} from './useDropdownSelectOptions';

describe('useDropdownSelectOptions', () => {
  describe('single value options', () => {
    it('should return correct selected label and icon for single value', () => {
      const options = ref<DropdownOption<string>[]>([
        { value: 'albums', label: 'Albums', icon: 'i-iconoir-album-list' },
        {
          value: 'artists',
          label: 'Artists',
          icon: 'i-material-symbols-artist-outline',
        },
      ]);
      const modelValue = ref('albums');

      const { selectedLabel, selectedIcon } = useDropdownSelectOptions(
        options,
        modelValue,
      );

      expect(selectedLabel.value).toBe('Albums');
      expect(selectedIcon.value).toBe('i-iconoir-album-list');
    });

    it('should update when modelValue changes', () => {
      const options = ref<DropdownOption<string>[]>([
        { value: 'albums', label: 'Albums', icon: 'i-iconoir-album-list' },
        {
          value: 'artists',
          label: 'Artists',
          icon: 'i-material-symbols-artist-outline',
        },
      ]);
      const modelValue = ref('albums');

      const { selectedLabel, selectedIcon } = useDropdownSelectOptions(
        options,
        modelValue,
      );

      modelValue.value = 'artists';

      expect(selectedLabel.value).toBe('Artists');
      expect(selectedIcon.value).toBe('i-material-symbols-artist-outline');
    });

    it('should generate dropdown items with correct active state', () => {
      const options = ref<DropdownOption<string>[]>([
        { value: 'albums', label: 'Albums', icon: 'i-iconoir-album-list' },
        {
          value: 'artists',
          label: 'Artists',
          icon: 'i-material-symbols-artist-outline',
        },
      ]);
      const modelValue = ref('albums');

      const { dropdownItems } = useDropdownSelectOptions(options, modelValue);

      const items = dropdownItems.value[0] as Array<{
        label: string;
        active: boolean;
        color: string;
      }>;

      expect(items).toHaveLength(2);
      expect(items[0]?.active).toBe(true);
      expect(items[0]?.color).toBe('primary');
      expect(items[1]?.active).toBe(false);
      expect(items[1]?.color).toBe('neutral');
    });
  });

  describe('multi-value cycling options', () => {
    it('should return correct selected label and icon for current value in array', () => {
      const options = ref<DropdownOption<string>[]>([
        {
          value: [
            {
              value: 'date-added-desc',
              label: 'Newest First',
              icon: 'lucide:calendar-arrow-up',
            },
            {
              value: 'date-added-asc',
              label: 'Oldest First',
              icon: 'lucide:calendar-arrow-down',
            },
          ],
        },
      ]);
      const modelValue = ref('date-added-desc');

      const { selectedLabel, selectedIcon } = useDropdownSelectOptions(
        options,
        modelValue,
      );

      expect(selectedLabel.value).toBe('Newest First');
      expect(selectedIcon.value).toBe('lucide:calendar-arrow-up');
    });

    it('should update label and icon when cycling to next value', () => {
      const options = ref<DropdownOption<string>[]>([
        {
          value: [
            {
              value: 'date-added-desc',
              label: 'Newest First',
              icon: 'lucide:calendar-arrow-up',
            },
            {
              value: 'date-added-asc',
              label: 'Oldest First',
              icon: 'lucide:calendar-arrow-down',
            },
          ],
        },
      ]);
      const modelValue = ref('date-added-desc');

      const { selectedLabel, selectedIcon } = useDropdownSelectOptions(
        options,
        modelValue,
      );

      modelValue.value = 'date-added-asc';

      expect(selectedLabel.value).toBe('Oldest First');
      expect(selectedIcon.value).toBe('lucide:calendar-arrow-down');
    });

    it('should show direction icons for two-value options', () => {
      const options = ref<DropdownOption<string>[]>([
        {
          value: [
            { value: 'asc', label: 'Ascending' },
            { value: 'desc', label: 'Descending' },
          ],
        },
      ]);
      const modelValue = ref('asc');

      const { dropdownItems } = useDropdownSelectOptions(options, modelValue);

      const items = dropdownItems.value[0] as Array<{
        trailingIcon?: string;
      }>;

      expect(items[0]?.trailingIcon).toBe('i-heroicons-arrow-up');

      modelValue.value = 'desc';

      const updatedItems = dropdownItems.value[0] as Array<{
        trailingIcon?: string;
      }>;

      expect(updatedItems[0]?.trailingIcon).toBe('i-heroicons-arrow-down');
    });

    it('should not show direction icons for options with more than two values', () => {
      const options = ref<DropdownOption<string>[]>([
        {
          value: [
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' },
          ],
        },
      ]);
      const modelValue = ref('small');

      const { dropdownItems } = useDropdownSelectOptions(options, modelValue);

      const items = dropdownItems.value[0] as Array<{
        trailingIcon?: string;
      }>;

      expect(items[0]?.trailingIcon).toBeUndefined();
    });

    it('should use option label as fallback when value has no label', () => {
      const options = ref<DropdownOption<string>[]>([
        {
          value: [
            { value: 'date-added-desc', label: 'Newest First' },
            { value: 'date-added-asc', label: 'Oldest First' },
          ],
          label: 'Date Added',
          icon: 'i-heroicons-calendar',
        },
      ]);
      const modelValue = ref('date-added-desc');

      const { dropdownItems } = useDropdownSelectOptions(options, modelValue);

      const items = dropdownItems.value[0] as Array<{
        label: string;
        icon?: string;
      }>;

      // Active item should show value-specific label, with option icon as fallback
      expect(items[0]?.label).toBe('Newest First');
      expect(items[0]?.icon).toBe('i-heroicons-calendar');
    });
  });

  describe('dropdown items generation', () => {
    it('should include label section when provided', () => {
      const options = ref<DropdownOption<string>[]>([
        { value: 'option1', label: 'Option 1' },
      ]);
      const modelValue = ref('option1');

      const { dropdownItems } = useDropdownSelectOptions(
        options,
        modelValue,
        'Select an option',
      );

      expect(dropdownItems.value).toHaveLength(2);
      const labelSection = dropdownItems.value[0] as Array<{
        type: string;
        label: string;
      }>;
      expect(labelSection[0]?.type).toBe('label');
      expect(labelSection[0]?.label).toBe('Select an option');
    });

    it('should not include label section when not provided', () => {
      const options = ref<DropdownOption<string>[]>([
        { value: 'option1', label: 'Option 1' },
      ]);
      const modelValue = ref('option1');

      const { dropdownItems } = useDropdownSelectOptions(options, modelValue);

      expect(dropdownItems.value).toHaveLength(1);
    });

    it('should show current value label for active multi-value option', () => {
      const options = ref<DropdownOption<string>[]>([
        {
          value: [
            { value: 'asc', label: 'A → Z' },
            { value: 'desc', label: 'Z → A' },
          ],
        },
      ]);
      const modelValue = ref('asc');

      const { dropdownItems } = useDropdownSelectOptions(options, modelValue);

      const items = dropdownItems.value[0] as Array<{ label: string }>;
      expect(items[0]?.label).toBe('A → Z');

      modelValue.value = 'desc';

      const updatedItems = dropdownItems.value[0] as Array<{ label: string }>;
      expect(updatedItems[0]?.label).toBe('Z → A');
    });

    it('should show first value label for inactive multi-value option', () => {
      const options = ref<DropdownOption<string>[]>([
        { value: 'albums', label: 'Albums' },
        {
          value: [
            { value: 'name-asc', label: 'A → Z' },
            { value: 'name-desc', label: 'Z → A' },
          ],
        },
      ]);
      const modelValue = ref('albums');

      const { dropdownItems } = useDropdownSelectOptions(options, modelValue);

      const items = dropdownItems.value[0] as Array<{
        label: string;
        active: boolean;
      }>;

      expect(items[0]?.active).toBe(true);
      expect(items[0]?.label).toBe('Albums');
      expect(items[1]?.active).toBe(false);
      expect(items[1]?.label).toBe('A → Z'); // First value in the inactive option
    });
  });

  describe('getNextValue cycling', () => {
    it('should return the same value for single-value options', () => {
      const options = ref<DropdownOption<string>[]>([
        { value: 'albums', label: 'Albums' },
      ]);
      const modelValue = ref('albums');

      const { dropdownItems } = useDropdownSelectOptions(options, modelValue);

      // Simulate clicking the option
      const items = dropdownItems.value[0] as Array<{
        onSelect: () => void;
      }>;
      items[0]?.onSelect();

      expect(modelValue.value).toBe('albums');
    });

    it('should cycle through values in multi-value options', () => {
      const options = ref<DropdownOption<string>[]>([
        {
          value: [
            { value: 'first', label: 'First' },
            { value: 'second', label: 'Second' },
            { value: 'third', label: 'Third' },
          ],
        },
      ]);
      const modelValue = ref('first');

      const { dropdownItems } = useDropdownSelectOptions(options, modelValue);

      const items = dropdownItems.value[0] as Array<{
        onSelect: () => void;
      }>;

      // Click once: first -> second
      items[0]?.onSelect();
      expect(modelValue.value).toBe('second');

      // Click again: second -> third
      items[0]?.onSelect();
      expect(modelValue.value).toBe('third');

      // Click again: third -> first (cycle back)
      items[0]?.onSelect();
      expect(modelValue.value).toBe('first');
    });

    it('should start at first value if current value is not in option', () => {
      const options = ref<DropdownOption<string>[]>([
        { value: 'albums', label: 'Albums' },
        {
          value: [
            { value: 'name-asc', label: 'A → Z' },
            { value: 'name-desc', label: 'Z → A' },
          ],
        },
      ]);
      const modelValue = ref('albums');

      const { dropdownItems } = useDropdownSelectOptions(options, modelValue);

      // Click the second option (name sorting)
      const items = dropdownItems.value[0] as Array<{
        onSelect: () => void;
      }>;
      items[1]?.onSelect();

      expect(modelValue.value).toBe('name-asc'); // First value in that option
    });
  });

  describe('edge cases', () => {
    it('should handle empty label and icon gracefully', () => {
      const options = ref<DropdownOption<string>[]>([{ value: 'test-value' }]);
      const modelValue = ref('test-value');

      const { selectedLabel, selectedIcon } = useDropdownSelectOptions(
        options,
        modelValue,
      );

      expect(selectedLabel.value).toBe('test-value'); // Falls back to stringified value
      expect(selectedIcon.value).toBeUndefined();
    });

    it('should return undefined for unmatched modelValue', () => {
      const options = ref<DropdownOption<string>[]>([
        { value: 'albums', label: 'Albums' },
      ]);
      const modelValue = ref('nonexistent');

      const { selectedLabel, selectedIcon } = useDropdownSelectOptions(
        options,
        modelValue,
      );

      expect(selectedLabel.value).toBeUndefined();
      expect(selectedIcon.value).toBeUndefined();
    });

    it('should handle numeric values', () => {
      const options = ref<DropdownOption<number>[]>([
        { value: 1, label: 'One', icon: 'i-heroicons-1' },
        { value: 2, label: 'Two', icon: 'i-heroicons-2' },
      ]);
      const modelValue = ref(1);

      const { selectedLabel, selectedIcon } = useDropdownSelectOptions(
        options,
        modelValue,
      );

      expect(selectedLabel.value).toBe('One');
      expect(selectedIcon.value).toBe('i-heroicons-1');

      modelValue.value = 2;

      expect(selectedLabel.value).toBe('Two');
      expect(selectedIcon.value).toBe('i-heroicons-2');
    });
  });
});
