import React, { useEffect, useRef, useState } from 'react';
import { FIELD_LABEL, fieldClass } from '../../../theme/fieldStyles';

/**
 * A remarks box that offers previously saved remarks back as the clerk types.
 *
 * Kept deliberately small: it draws the same square field InputElement draws,
 * plus a dropdown underneath it. Suggestions are fetched by the caller, so this
 * box knows nothing about which voucher's remarks they are -- the caller decides
 * that by choosing its endpoint.
 *
 * Suggestions are only sought once the field holds at least three non-space
 * characters, and they disappear again the moment the value drops below that.
 * A debounce and a request sequence guard mean an older, slower response can
 * never overwrite a newer one. The dropdown is navigable by mouse and keyboard,
 * and Enter selects without reaching whatever the surrounding form would
 * otherwise do.
 */
interface RemarkAutocompleteProps {
  id?: string;
  name?: string;
  label?: React.ReactNode;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  /** Called when Enter is pressed with no suggestion selected. */
  onEnter?: () => void;
  /** Supplies matching suggestions for a trimmed query of at least 3 characters. */
  fetchSuggestions: (query: string) => Promise<string[]>;
  className?: string;
  autoComplete?: string;
}

const normalize = (items: string[]): string[] =>
  items
    .map((item) => String(item ?? '').trim())
    .filter((item, index, all) => item !== '' && all.indexOf(item) === index);

const RemarkAutocomplete: React.FC<RemarkAutocompleteProps> = ({
  id = '',
  name = '',
  label = '',
  placeholder = 'Enter Remarks',
  value,
  onChange,
  onEnter,
  fetchSuggestions,
  className = '',
  autoComplete = 'off',
}) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [highlight, setHighlight] = useState(-1);
  // The text that drives the search. It only changes when the clerk types, not
  // when the parent pushes a value in (an edit, a reset) -- those are picked up
  // by the sync effect below and must not fire a search of their own.
  const [query, setQuery] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const fetchRef = useRef(fetchSuggestions);
  fetchRef.current = fetchSuggestions;
  const seqRef = useRef(0);
  const skipSearchRef = useRef(false);

  const listId = `${id || name}-suggestions`;

  // Search only on the clerk's own typing. Fewer than 3 trimmed characters
  // closes and clears immediately, and any in-flight response for an older
  // query is left behind by the sequence guard.
  useEffect(() => {
    const seq = ++seqRef.current;
    const trimmed = query.trim();

    if (trimmed.length < 3) {
      setOpen(false);
      setItems([]);
      setHighlight(-1);
      return;
    }

    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      setOpen(false);
      setItems([]);
      setHighlight(-1);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const result = await fetchRef.current(trimmed);
        if (seqRef.current === seq) {
          const next = normalize(result);
          setItems(next);
          setHighlight(-1);
          setOpen(next.length > 0);
        }
      } catch {
        if (seqRef.current === seq) {
          setItems([]);
          setHighlight(-1);
          setOpen(false);
        }
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  // Keep the search text in step with the displayed value when the value came
  // from outside this box (loading a row, resetting the form). That change must
  // not open the list, so the next search is suppressed.
  useEffect(() => {
    if (value === query) {
      return;
    }

    skipSearchRef.current = value.trim().length >= 3;
    setQuery(value);
    setOpen(false);
    setItems([]);
    setHighlight(-1);
  }, [value, query]);

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocumentMouseDown);
    return () => document.removeEventListener('mousedown', onDocumentMouseDown);
  }, []);

  const select = (item: string) => {
    onChange(item);
    setOpen(false);
    setItems([]);
    setHighlight(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (items.length === 0) {
        return;
      }
      setOpen(true);
      setHighlight((prev) => (prev + 1) % items.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (items.length === 0) {
        return;
      }
      setOpen(true);
      setHighlight((prev) => (prev <= 0 ? items.length - 1 : prev - 1));
      return;
    }

    if (event.key === 'Enter') {
      if (open && highlight >= 0 && items[highlight]) {
        event.preventDefault();
        select(items[highlight]);
        return;
      }

      setOpen(false);
      onEnter?.();
      return;
    }

    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
    }
  };

  const optionClass = (active: boolean) =>
    [
      'cursor-pointer px-3 py-2 text-sm text-[rgb(var(--c-text))]',
      active
        ? 'bg-[rgb(var(--c-gray-200))] dark:bg-[rgb(var(--c-gray-600))]'
        : 'bg-white dark:bg-[rgb(var(--c-graydark))]',
    ].join(' ');

  return (
    <div className="text-left flex flex-col">
      <label htmlFor={id || name} className={FIELD_LABEL}>
        {label}
      </label>

      <div ref={containerRef} className="relative">
        <input
          id={id}
          name={name}
          type="text"
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          className={fieldClass(undefined, `w-full ${className}`)}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(event.target.value);
          }}
          onBlur={() => {
            setOpen(false);
            setItems([]);
            setHighlight(-1);
          }}
          onKeyDown={handleKeyDown}
        />

        {open && items.length > 0 ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute left-0 right-0 z-[1000] mt-1 max-h-60 overflow-auto border border-[rgb(var(--c-border-strong))] bg-white shadow-lg dark:bg-[rgb(var(--c-graydark))]"
          >
            {items.map((item, index) => (
              <li
                key={item}
                role="option"
                aria-selected={index === highlight}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(item)}
                onMouseEnter={() => setHighlight(index)}
                className={optionClass(index === highlight)}
              >
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
};

export default RemarkAutocomplete;
