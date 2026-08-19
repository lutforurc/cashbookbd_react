import React from 'react';
import { FiRotateCcw } from 'react-icons/fi';
import { fieldClass, FIELD_LABEL, FIELD_SELECT } from '../../../theme/fieldStyles';
import { Input, Select } from '../../utils/fields/FormControls';
import { IconButton } from '../../../pages/UiElements/CustomButtons';

/**
 * What one user wants the software to look like.
 *
 * It sits on the user form rather than the branch form on purpose: this is
 * taste, not policy. Two clerks sharing a branch can want different things, and
 * one of them choosing a darker screen should not repaint the other's.
 *
 * Every colour is asked for twice, once per mode. A single value cannot serve
 * both -- the sidebar is white on a light screen and near-black on a dark one,
 * and a brand blue that reads on white is often too deep on black. Either half
 * can be left alone: setting a dark colour does not commit you to a light one.
 *
 * Nothing here paints anything itself. Each control moves a variable the whole
 * stylesheet is already reading -- see theme/userTheme.ts -- which is why one
 * colour reaches the buttons, the links, the active menu row and the charts at
 * once.
 */

export type ThemeSetupValues = Record<string, string | undefined>;

interface ThemeSetupSectionProps {
  values: ThemeSetupValues;
  /** Called with the field name and its new value, ready for the form's state. */
  onChange: (name: string, value: string) => void;
}

/**
 * One colour box: the swatch for choosing, the hex for typing or pasting the
 * one a brand guide gave someone, and the arrow for giving it back.
 *
 * Empty means "whatever the software ships with", so the swatch shows that
 * colour without claiming it as a choice.
 */
const ColorBox: React.FC<{
  name: string;
  value?: string;
  fallback: string;
  title: string;
  onChange: (name: string, value: string) => void;
}> = ({ name, value, fallback, title, onChange }) => (
  <div className="flex items-center gap-1.5">
    <Input
      type="color"
      value={value || fallback}
      onChange={(e) => onChange(name, e.target.value)}
      className={fieldClass(undefined, 'w-10 shrink-0 cursor-pointer p-1')}
      title={title}
    />
    <Input
      type="text"
      value={value || ''}
      placeholder={fallback}
      onChange={(e) => onChange(name, e.target.value)}
      className={fieldClass(undefined, 'w-full text-xs')}
      title={title}
    />
    <IconButton
      icon={<FiRotateCcw />}
      title={`${title} -- back to the software's own colour`}
      onClick={() => onChange(name, '')}
      tone="muted"
      className="shrink-0 px-0.5"
    />
  </div>
);

/** A colour in both modes, side by side, so the pair is chosen as a pair. */
const ColorPair: React.FC<{
  field: string;
  label: string;
  lightFallback: string;
  darkFallback: string;
  help?: string;
  values: ThemeSetupValues;
  onChange: (name: string, value: string) => void;
}> = ({ field, label, lightFallback, darkFallback, help, values, onChange }) => (
  <div>
    <label className={`${FIELD_LABEL} text-sm`}>{label}</label>
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      <div>
        <span className="mb-0.5 block text-[11px] uppercase tracking-wide text-gray-400">
          Light mode
        </span>
        <ColorBox
          name={`theme_${field}_light`}
          value={values[`theme_${field}_light`]}
          fallback={lightFallback}
          title={`${label} -- light mode`}
          onChange={onChange}
        />
      </div>
      <div>
        <span className="mb-0.5 block text-[11px] uppercase tracking-wide text-gray-400">
          Dark mode
        </span>
        <ColorBox
          name={`theme_${field}_dark`}
          value={values[`theme_${field}_dark`]}
          fallback={darkFallback}
          title={`${label} -- dark mode`}
          onChange={onChange}
        />
      </div>
    </div>
    {help ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{help}</p> : null}
  </div>
);

/** A ruled-off run of related controls, so the section reads in groups. */
const Group: React.FC<{ title: string; note: string; children: React.ReactNode }> = ({
  title,
  note,
  children,
}) => (
  <div className="mt-4 border-t border-gray-200 pt-4 first:mt-0 first:border-0 first:pt-0 dark:border-strokedark">
    <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {title}
    </h4>
    <p className="mb-3 mt-1 text-xs text-gray-500 dark:text-gray-400">{note}</p>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{children}</div>
  </div>
);

const ThemeSetupSection: React.FC<ThemeSetupSectionProps> = ({ values, onChange }) => {
  const pair = (
    field: string,
    label: string,
    lightFallback: string,
    darkFallback: string,
    help?: string,
  ) => (
    <ColorPair
      field={field}
      label={label}
      lightFallback={lightFallback}
      darkFallback={darkFallback}
      help={help}
      values={values}
      onChange={onChange}
    />
  );

  return (
    <div className="md:col-span-2 rounded border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-transparent">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">
          Color and Theme Setup
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          How the software looks for this user, in each mode. Every box left
          blank keeps the colour the software ships with, and the arrow beside
          one puts it back.
        </p>
      </div>

      <Group
        title="Meaning"
        note="The colours the software already says things with. Changing one changes it everywhere that thing is said."
      >
        {pair('primary_color', 'Brand (Primary)', '#2B5FD9', '#2B5FD9',
          'Buttons, links, the menu row you are on.')}
        {pair('secondary_color', 'Secondary', '#7FBEEA', '#7FBEEA',
          'The quieter brand colour, beside the first.')}
        {pair('success_color', 'Success', '#17804C', '#17804C',
          'Saved, approved, paid.')}
        {pair('danger_color', 'Danger', '#CB3A4C', '#CB3A4C',
          'Deleted, overdue, refused.')}
        {pair('warning_color', 'Warning', '#F0A000', '#F0A000',
          'Careful -- not wrong yet.')}
        {pair('info_color', 'Info', '#2E90E0', '#2E90E0',
          'A notice that is neither good news nor bad.')}
      </Group>

      <Group
        title="The furniture"
        note="The frame around the work, rather than the work itself. This is where the two modes differ most."
      >
        {pair('sidebar_color', 'Sidebar', '#FFFFFF', '#212932',
          'The strip down the left.')}
        {pair('header_color', 'Header Bar', '#FFFFFF', '#212932',
          'The bar across the top. Follows the sidebar unless set.')}
        {pair('page_bg_color', 'Page Background', '#F4F7FA', '#171D25',
          'The paper the cards sit on.')}
      </Group>

      <Group
        title="Charts and print"
        note="Where colour has a job of its own: telling one line from another, and going onto paper."
      >
        <div>
          <label className={`${FIELD_LABEL} text-sm`}>Chart Colors</label>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <div>
              <span className="mb-0.5 block text-[11px] uppercase tracking-wide text-gray-400">
                Light mode
              </span>
              <Input
                type="text"
                value={values.theme_chart_palette_light || ''}
                placeholder="#2B5FD9, #12A66E, #E08A0C"
                onChange={(e) => onChange('theme_chart_palette_light', e.target.value)}
                className={fieldClass(undefined, 'w-full text-xs')}
              />
            </div>
            <div>
              <span className="mb-0.5 block text-[11px] uppercase tracking-wide text-gray-400">
                Dark mode
              </span>
              <Input
                type="text"
                value={values.theme_chart_palette_dark || ''}
                placeholder="#5B8DEF, #34D399, #FBBF24"
                onChange={(e) => onChange('theme_chart_palette_dark', e.target.value)}
                className={fieldClass(undefined, 'w-full text-xs')}
              />
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            The series in order, separated by commas -- up to eight. Give fewer
            and the rest stay as they ship.
          </p>
        </div>

        <div>
          <label className={`${FIELD_LABEL} text-sm`}>Report Print Color</label>
          <div className="sm:w-1/2">
            <span className="mb-0.5 block text-[11px] uppercase tracking-wide text-gray-400">
              Both modes
            </span>
            <ColorBox
              name="theme_print_color"
              value={values.theme_print_color}
              fallback="#0B0E12"
              title="Report print colour"
              onChange={onChange}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            One value, because paper has no dark mode -- a report prints on
            white whichever screen it was ordered from. The headings take this
            colour; the figures stay black, since colour costs more to print.
          </p>
        </div>
      </Group>

      <Group
        title="Size and mode"
        note="Not colour, and not per mode: how big the controls are, and which mode the day starts in."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={`${FIELD_LABEL} text-sm`} htmlFor="theme_control_height">
              Input, Dropdown &amp; Button Height
            </label>
            <Input
              id="theme_control_height"
              name="theme_control_height"
              type="number"
              min={24}
              max={56}
              value={values.theme_control_height || ''}
              placeholder="34 (default)"
              onChange={(e) => onChange('theme_control_height', e.target.value)}
              className={fieldClass(undefined, 'w-full text-sm')}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              In pixels, one number for all three -- a box, a dropdown and the
              button beside them stand together or the row looks wrong. 24 to 56.
            </p>
          </div>

          <div>
            <label className={`${FIELD_LABEL} text-sm`} htmlFor="theme_control_radius">
              Corner Rounding
            </label>
            <Input
              id="theme_control_radius"
              name="theme_control_radius"
              type="number"
              min={0}
              max={20}
              value={values.theme_control_radius || ''}
              placeholder="0 (square, as it ships)"
              onChange={(e) => onChange('theme_control_radius', e.target.value)}
              className={fieldClass(undefined, 'w-full text-sm')}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              In pixels. 0 is square; past about 20 a box turns into a pill.
            </p>
          </div>
        </div>

        <div className="sm:w-1/2">
          <label className={`${FIELD_LABEL} text-sm`} htmlFor="theme_mode">
            Opening Mode
          </label>
          <Select
            id="theme_mode"
            name="theme_mode"
            value={values.theme_mode || ''}
            onChange={(e) => onChange('theme_mode', e.target.value)}
            className={`${FIELD_SELECT} w-full px-2 text-sm`}
          >
            <option value="">Whatever was left on</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            The mode this user starts the day in. The switch in the top bar
            still wins for the rest of that session.
          </p>
        </div>
      </Group>
    </div>
  );
};

export default ThemeSetupSection;
