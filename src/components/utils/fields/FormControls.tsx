import React from 'react';

/**
 * The three form controls every hand-written field in the app is made of.
 *
 * Most fields already go through InputElement, DropdownCommon and their
 * siblings -- around a thousand of them. These are for the two hundred that do
 * not: a search box inside a header, a checkbox in a table cell, a textarea on
 * a settings page. They were written as bare elements, so anything that should
 * be true of every field in the app -- a focus ring, a disabled treatment, a
 * readonly look -- could not be said anywhere.
 *
 * Like the Button primitive, these add nothing to what a call site passes.
 * Classes, handlers, refs, aria all go straight through, so moving a screen
 * onto them changes nothing about how it looks. What it changes is that there
 * is now one place to change them from.
 *
 * A field wanting the app's full look should reach for InputElement instead --
 * that is the styled one. These are the floor beneath it.
 */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...rest }, ref) => <input ref={ref} className={className} {...rest} />,
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, ...rest }, ref) => (
    <select ref={ref} className={className} {...rest}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', children, ...rest }, ref) => (
    <textarea ref={ref} className={className} {...rest}>
      {children}
    </textarea>
  ),
);
Textarea.displayName = 'Textarea';
