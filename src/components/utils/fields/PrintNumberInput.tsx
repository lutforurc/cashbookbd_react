import React, { useEffect, useRef, useState } from 'react';
import InputElement from './InputElement';

type Props = React.ComponentProps<typeof InputElement>;

/**
 * The base the print toolbar's two little number boxes are built on.
 *
 * Its whole job is to let the box be emptied and stay empty. The screens hold
 * these numbers as `Number(event.target.value) || 12`, so the moment the last
 * digit goes the value is 0, which is falsy, and the default lands back in the
 * box -- delete twice and you are staring at a number you did not type and
 * cannot clear.
 *
 * So the box keeps what was actually typed, and the screen's own state carries
 * on being whatever it makes of it. An emptied box is left empty even after the
 * cursor goes elsewhere, because a box that refills itself the moment it is
 * left is a box that cannot be cleared at all. What prints then is the screen's
 * default, which is what an empty box already meant.
 *
 * A number typed in is handed back to the screen to normalise: type 007 and the
 * box reads 7 once you leave it. Only emptiness is the box's own to keep.
 */
const PrintNumberInput: React.FC<Props> = ({ value, onChange, onBlur, onFocus, ...rest }) => {
  // null when the box has nothing of its own to say: it shows the screen's
  // value, as it did before any of this.
  const [draft, setDraft] = useState<string | null>(null);
  const editing = useRef(false);

  // A value arriving from elsewhere -- a Reset button, a fresh report -- puts
  // the box back under the screen's control. Guarded by `editing`, because the
  // screen also answers our own keystrokes, and treating those as news from
  // outside would undo the emptying as fast as it was done.
  useEffect(() => {
    if (!editing.current) setDraft(null);
  }, [value]);

  return (
    <InputElement
      {...rest}
      value={draft ?? value}
      onFocus={(event) => {
        editing.current = true;
        onFocus?.(event);
      }}
      onChange={(event) => {
        setDraft(event.target.value);
        onChange?.(event);
      }}
      onBlur={(event) => {
        editing.current = false;
        // Emptiness is kept; anything else goes back to the screen's reading of
        // what was typed.
        setDraft((current) => (current !== null && current.trim() === '' ? current : null));
        onBlur?.(event);
      }}
    />
  );
};

export default PrintNumberInput;
