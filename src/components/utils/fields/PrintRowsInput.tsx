import React from 'react';
import InputElement from './InputElement';
import PrintNumberInput from './PrintNumberInput';

type Props = React.ComponentProps<typeof InputElement>;

/**
 * The box beside the font box: how many rows go on a printed page.
 *
 * Same reasoning as PrintFontInput -- the explanation belongs to the box rather
 * than to each of the sixty screens that draws one.
 *
 * The wording says `for print` because on nearly every screen that is all the
 * number does; the list on screen is paged by its own control. Employees is the
 * exception -- there one number does both jobs -- and it passes its own title
 * rather than let this one tell a half-truth.
 *
 * ⚠️ NOTHING IN THE BOX MEANS ALL OF THEM, and the box says so rather than
 * showing a nought.
 *
 * Zero is what every one of these screens now starts at, because an unbroken
 * statement is what people print far more often than a page of twelve. But a
 * lone "0" in a box labelled rows-per-page reads as a mistake -- somebody
 * cleared it, or the screen failed to load a number -- and the first instinct is
 * to type something over it. An empty box with "All" behind it says the same
 * thing in the words the answer deserves.
 *
 * ⚠️ Display only. The parent's state is untouched: it still holds 0, still
 * sends 0 to the print component, and the print component still reads 0 as one
 * page. Rewriting the state here would mean every screen's number meant
 * something different from what it stored.
 */
const PrintRowsInput: React.FC<Props> = ({
  title = 'Rows per page for print',
  placeholder = 'All',
  value,
  ...rest
}) => (
  <PrintNumberInput
    {...rest}
    // A nought from the parent is drawn as an empty box, so the placeholder
    // behind it is what the reader sees. '0' as well as 0: some screens keep
    // this number as text and hand it over already stringified.
    value={value === 0 || value === '0' ? '' : value}
    placeholder={placeholder}
    title={title}
  />
);

export default PrintRowsInput;
