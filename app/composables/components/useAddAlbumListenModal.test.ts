import { describe, expect, it } from 'vitest';
import { useAddAlbumListenModal } from './useAddAlbumListenModal';

describe('useAddAlbumListenModal', () => {
  describe('initial state', () => {
    it('should start closed', () => {
      const { isOpen } = useAddAlbumListenModal();

      expect(isOpen.value).toBe(false);
    });

    it('should have undefined date', () => {
      const { dateOfListen } = useAddAlbumListenModal();

      expect(dateOfListen.value).toBeUndefined();
    });
  });

  describe('open', () => {
    it('should open modal with provided date', () => {
      const { isOpen, dateOfListen, open } = useAddAlbumListenModal();
      const testDate = new Date('2024-01-15');

      open({ date: testDate });

      expect(isOpen.value).toBe(true);
      expect(dateOfListen.value).toBe(testDate);
    });

    it('should update date when opened multiple times', () => {
      const { dateOfListen, open } = useAddAlbumListenModal();
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-02-20');

      open({ date: date1 });
      expect(dateOfListen.value).toBe(date1);

      open({ date: date2 });
      expect(dateOfListen.value).toBe(date2);
    });
  });

  describe('close', () => {
    it('should close modal', () => {
      const { isOpen, open, close } = useAddAlbumListenModal();
      const testDate = new Date('2024-01-15');

      open({ date: testDate });
      expect(isOpen.value).toBe(true);

      close();
      expect(isOpen.value).toBe(false);
    });

    it('should clear date when closed', () => {
      const { dateOfListen, open, close } = useAddAlbumListenModal();
      const testDate = new Date('2024-01-15');

      open({ date: testDate });
      close();

      expect(dateOfListen.value).toBeUndefined();
    });
  });

  describe('shared state', () => {
    it('should share state between multiple instances', () => {
      const instance1 = useAddAlbumListenModal();
      const instance2 = useAddAlbumListenModal();
      const testDate = new Date('2024-01-15');

      instance1.open({ date: testDate });

      expect(instance1.isOpen.value).toBe(true);
      expect(instance2.isOpen.value).toBe(true);
      expect(instance2.dateOfListen.value).toBe(testDate);
    });
  });
});
