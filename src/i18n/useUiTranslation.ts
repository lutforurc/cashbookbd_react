import { useEffect } from 'react';
import i18n from './index';

/**
 * Shows the app's fixed form words (labels, placeholders, option text, button
 * captions) in the screen's language.
 *
 * Editing every form's JSX is not realistic -- there are hundreds of screens and
 * the words repeat -- so this works on the rendered DOM, the same way
 * useLocalDigits maps digits. A dictionary in common.json -> uiLabel is keyed by
 * the English text; a text node or an attribute whose trimmed value is a key is
 * replaced, and everything else is left alone.
 *
 * Beyond exact words, a few Bangla word-order rules cover the endless
 * "Select X" / "Enter X" / "Search X" placeholders: the noun X is looked up
 * (case-insensitively) in the same glossary and the Bangla is built around it.
 *
 * The English original is kept on the node itself, so switching back to English
 * restores the page exactly. A MutationObserver re-applies it to content React
 * renders later: a row, a dropdown option, a reopened modal.
 *
 * Never inside script/style, a textarea, or a rich-text editor -- so no
 * user-entered data and no CSS is ever touched. `[data-no-i18n]` opts out.
 */
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const;
const SKIP = 'script,style,textarea,[contenteditable],[data-no-i18n]';

type TextNodeEx = Text & {
  __uiLabelOriginal?: string;
  __uiLabelTranslated?: string;
};
type ElementEx = Element & { __uiLabelAttrs?: Record<string, string> };
type Resolve = (key: string) => string | undefined;

/**
 * Glossaries the on-screen translator reads, lowest priority first. A page
 * heading is often the same words as its tab or menu, so merging all three lets
 * a heading like "Daily Account Book" follow the tab without a second entry;
 * uiLabel wins where the same English word is worded differently for a form.
 */
const LABEL_NAMESPACES = ['menuLabel', 'tabLabel', 'uiLabel'];

const readDict = (lang: string): Record<string, string> => {
  const merged: Record<string, string> = {};
  for (const ns of LABEL_NAMESPACES) {
    const dict = i18n.getResource(lang, 'common', ns) as
      | Record<string, string>
      | undefined;
    if (dict && typeof dict === 'object') Object.assign(merged, dict);
  }
  return merged;
};

const hasKeys = (dict: Record<string, string>) => Object.keys(dict).length > 0;

// True once anything has been translated, so an English screen does not walk
// the whole DOM looking for originals that were never written.
let dirty = false;

const edges = (value: string) => ({
  lead: (value.match(/^\s*/) || [''])[0],
  trail: (value.match(/\s*$/) || [''])[0],
});

/** Turn the glossary into a lookup: exact, case-insensitive, then word-order rules. */
const buildResolver = (dict: Record<string, string>): Resolve => {
  const lower: Record<string, string> = Object.create(null);
  for (const [key, value] of Object.entries(dict)) lower[key.toLowerCase()] = value;

  const exact = (text: string) => dict[text] ?? lower[text.toLowerCase()];
  const noun = (text: string) => lower[text.toLowerCase()];

  return (key: string) => {
    const direct = exact(key);
    if (direct) return direct;

    let m: RegExpExecArray | null;

    if ((m = /^Select\s+(.+)$/i.exec(key))) {
      const n = noun(m[1]);
      return n ? `${n} নির্বাচন করুন` : undefined;
    }
    if ((m = /^Enter\s+(.+)$/i.exec(key))) {
      const n = noun(m[1]);
      return n ? `${n} লিখুন` : undefined;
    }
    if ((m = /^Search\s+(.+)$/i.exec(key))) {
      const n = noun(m[1]);
      return n ? `${n} খুঁজুন` : undefined;
    }
    if (/^Add\s+New$/i.test(key)) return 'নতুন যোগ করুন';
    if ((m = /^Add\s+(.+)$/i.exec(key))) {
      const n = noun(m[1]);
      return n ? `${n} যোগ করুন` : undefined;
    }
    if ((m = /^(.+?)\s*\(Tk\.\)$/i.exec(key))) {
      const n = noun(m[1]);
      return n ? `${n} (টাকা)` : undefined;
    }

    return undefined;
  };
};

const translateText = (node: Node, resolve: Resolve) => {
  if (node.nodeType !== Node.TEXT_NODE) return;
  const text = node as TextNodeEx;
  const parent = text.parentElement;
  if (!parent || parent.closest(SKIP)) return;

  const value = text.nodeValue || '';
  const key = value.trim();
  if (!key) return;

  const target = resolve(key);

  if (target) {
    const { lead, trail } = edges(value);
    const next = lead + target + trail;
    // English is the original every time it is (re)seen -- a fresh render, or
    // React resetting the node. Keep it so English can be put back later.
    text.__uiLabelOriginal = value;
    text.__uiLabelTranslated = next;
    if (value !== next) {
      text.nodeValue = next;
      dirty = true;
    }
    return;
  }

  // Not a key. If it is still our own translation, leave it; if React changed
  // it to something else, forget the stale original.
  if (text.__uiLabelTranslated !== undefined && value !== text.__uiLabelTranslated) {
    delete text.__uiLabelOriginal;
    delete text.__uiLabelTranslated;
  }
};

const translateElementAttrs = (el: Element, resolve: Resolve) => {
  if (el.closest(SKIP)) return;
  const node = el as ElementEx;

  for (const name of ATTRS) {
    const value = el.getAttribute(name);
    if (value == null) continue;
    const target = resolve(value.trim());
    if (!target || value === target) continue;

    if (!node.__uiLabelAttrs) node.__uiLabelAttrs = {};
    if (!(name in node.__uiLabelAttrs)) node.__uiLabelAttrs[name] = value;
    el.setAttribute(name, target);
    dirty = true;
  }
};

const walk = (root: Node, resolve: Resolve) => {
  if (root.nodeType === Node.TEXT_NODE) {
    translateText(root, resolve);
    return;
  }
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as Element;
    if (el.closest(SKIP)) return;
    translateElementAttrs(el, resolve);
  }

  const elementWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (node) =>
      (node as Element).closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  for (let n = elementWalker.nextNode(); n; n = elementWalker.nextNode()) {
    translateElementAttrs(n as Element, resolve);
  }

  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      (node as Text).parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  for (let n = textWalker.nextNode(); n; n = textWalker.nextNode()) translateText(n, resolve);
};

/** Put every translated node back to the English it held. */
const restore = (root: Node) => {
  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = textWalker.nextNode(); n; n = textWalker.nextNode()) {
    const text = n as TextNodeEx;
    if (text.__uiLabelOriginal !== undefined) {
      text.nodeValue = text.__uiLabelOriginal;
      delete text.__uiLabelOriginal;
      delete text.__uiLabelTranslated;
    }
  }

  const elementWalker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  for (let n = elementWalker.nextNode(); n; n = elementWalker.nextNode()) {
    const el = n as ElementEx;
    if (!el.__uiLabelAttrs) continue;
    for (const [name, value] of Object.entries(el.__uiLabelAttrs)) el.setAttribute(name, value);
    delete el.__uiLabelAttrs;
  }
};

/** `language` is the resolved code from useLanguage(): 'en' or a local code. */
export const useUiTranslation = (language: string) => {
  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return undefined;

    const body = document.body;

    if (!language || language === 'en') {
      if (dirty) {
        restore(body);
        dirty = false;
      }
      return undefined;
    }

    let dict = readDict(language);
    let resolve = buildResolver(dict);
    if (hasKeys(dict)) walk(body, resolve);

    const onLoaded = (loaded?: unknown) => {
      if (typeof loaded === 'string' && loaded !== language) return;
      dict = readDict(language);
      resolve = buildResolver(dict);
      if (hasKeys(dict)) walk(body, resolve);
    };
    i18n.on('loaded', onLoaded);

    // Batch new content to one pass per frame so a table that fills 200 rows
    // does not trigger 200 walks.
    let scheduled = false;
    const queue = new Set<Node>();
    const flush = () => {
      scheduled = false;
      queue.forEach((node) => {
        if (node.isConnected) walk(node, resolve);
      });
      queue.clear();
    };
    const schedule = (node: Node) => {
      queue.add(node);
      if (scheduled) return;
      scheduled = true;
      if (typeof requestAnimationFrame === 'function') requestAnimationFrame(flush);
      else setTimeout(flush, 0);
    };

    const observer = new MutationObserver((changes) => {
      for (const change of changes) {
        if (change.type === 'characterData') {
          translateText(change.target, resolve);
        } else if (change.type === 'attributes') {
          translateElementAttrs(change.target as Element, resolve);
        } else {
          change.addedNodes.forEach(schedule);
        }
      }
    });

    observer.observe(body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS],
    });

    return () => {
      observer.disconnect();
      i18n.off('loaded', onLoaded);
    };
  }, [language]);
};
