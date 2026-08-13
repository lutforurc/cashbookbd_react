import { useEffect } from 'react';
import useLocalStorage from './useLocalStorage';

/**
 * Light or dark, and the one place that decides it.
 *
 * The class goes on <html>, not <body>. Three things read it and they were not
 * agreeing: this hook wrote it to <body>, the customer dashboard wrote it to
 * <html>, and OrderDropdown asked <html> what mode it was in -- so its dropdown
 * drew light-mode colours on a dark page, every time. One element ends that.
 *
 * <html> is also the only element that exists before React mounts, which is
 * what lets the snippet in index.html paint the right theme on the first frame
 * instead of flashing white.
 */
type ColorMode = 'light' | 'dark';

/**
 * Declared as a tuple, not inferred. Without it TypeScript widens the return to
 * an array of "string or setter" and every caller has to prove the second entry
 * is callable before using it.
 */
const useColorMode = (): [ColorMode, (value: ColorMode) => void] => {
  const [colorMode, setColorMode] = useLocalStorage<ColorMode>('color-theme', 'light');

  useEffect(() => {
    const root = window.document.documentElement.classList;

    colorMode === 'dark' ? root.add('dark') : root.remove('dark');
  }, [colorMode]);

  return [colorMode, setColorMode];
};

export default useColorMode;
