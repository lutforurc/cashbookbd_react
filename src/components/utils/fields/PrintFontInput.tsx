import React from 'react';
import InputElement from './InputElement';
import PrintNumberInput from './PrintNumberInput';

type Props = React.ComponentProps<typeof InputElement>;

/**
 * The little box that sets the type size of a printed report.
 *
 * It is the same box on some fifty screens, and on most of them it is two
 * digits sitting beside a Search button with nothing to say what they are for.
 * The explanation belongs to the box rather than to each screen that draws
 * one -- put it here and a screen cannot forget it, and the wording is changed
 * in one place rather than fifty.
 *
 * Everything is overridable: a screen that wants different words, or the
 * bubble somewhere else, passes its own.
 */
const PrintFontInput: React.FC<Props> = ({ title = 'Font Size for print', ...rest }) => (
  <PrintNumberInput {...rest} title={title} />
);

export default PrintFontInput;
