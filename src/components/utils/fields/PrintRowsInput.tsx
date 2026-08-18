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
 */
const PrintRowsInput: React.FC<Props> = ({ title = 'Rows per page for print', ...rest }) => (
  <PrintNumberInput {...rest} title={title} />
);

export default PrintRowsInput;
