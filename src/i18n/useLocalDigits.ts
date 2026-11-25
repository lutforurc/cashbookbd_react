import { RefObject, useEffect } from 'react';
import { toLocalDigits } from './mapper';

/**
 * Shows every digit inside `ref` as a Bangla digit while `on`.
 *
 * Works on the rendered text, not on the figures, so the hundred-odd amount
 * and date formatters in a report stay untouched and nothing that is parsed
 * back (inputs, values) ever holds a Bangla digit. Watches for re-renders, so
 * a new report or a reopened modal converts too.
 * ponytail: text nodes only -- input values and portalled modals keep Latin
 * digits; move the conversion into the formatters if those need it.
 */
export const useLocalDigits = (ref: RefObject<HTMLElement | null>, on: boolean) => {
  useEffect(() => {
    const root = ref.current;
    if (!root || !on) return undefined;

    const convertText = (text: Node) => {
      if (text.parentElement?.closest('style, script')) return;
      const value = text.nodeValue || '';
      if (/[0-9]/.test(value)) text.nodeValue = toLocalDigits(value, 'local');
    };

    const convert = (node: Node) => {
      // A changed text node is itself the target; a walker only visits children.
      if (node.nodeType === Node.TEXT_NODE) {
        convertText(node);
        return;
      }

      // Never inside <style>/<script>: a print sheet's `@page { size: 210mm
      // 297mm }` turned into Bangla digits is invalid, and the page went
      // landscape.
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
        acceptNode: (text) =>
          text.parentElement?.closest('style, script')
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_ACCEPT,
      });
      for (let text = walker.nextNode(); text; text = walker.nextNode()) convertText(text);
    };

    convert(root);
    const observer = new MutationObserver((changes) => {
      for (const change of changes) {
        if (change.type === 'characterData') convert(change.target);
        change.addedNodes.forEach(convert);
      }
    });
    observer.observe(root, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [ref, on]);
};
