import { useEffect } from 'react';

/**
 * Ctrl+U runs the Update button that is on screen.
 *
 * It clicks the real button rather than calling a handler, so it takes that
 * button's own path: its validation, its disabled state, its conditional
 * rendering, whatever it does on a refusal.
 *
 * ⚠️ ONE listener for the whole app, not a hook in each of the fifty-odd
 * screens that carry an Update button. A new screen gets the shortcut by
 * naming its button "Update..." -- nothing to wire, nothing to forget.
 *
 * ponytail: the button is found by its text, so the label is the contract --
 * rename "Update" and the shortcut stops seeing it. A data attribute would be
 * the upgrade if that ever has to survive more labels.
 */
const useCtrlUUpdate = () => {
  useEffect(() => {
    const isUsable = (button: HTMLButtonElement) => {
      if (button.disabled) return false;

      // print copies and closed dropdowns are in the DOM but not on screen
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
      if (event.repeat) return;
      // code as well as key: a non-Latin layout can report another character.
      if (event.key !== 'u' && event.key !== 'U' && event.code !== 'KeyU') return;

      // The last match, not the first: a dialog is rendered after the page it
      // covers, and the button being looked at is the dialog's.
      const update = Array.from(
        document.querySelectorAll<HTMLButtonElement>('button'),
      )
        .filter((button) => /^update\b/i.test((button.textContent || '').trim()))
        .filter(isUsable)
        .pop();

      // No Update on this screen: leave Ctrl+U to the browser.
      if (!update) return;

      event.preventDefault();
      update.click();
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);
};

export default useCtrlUUpdate;
