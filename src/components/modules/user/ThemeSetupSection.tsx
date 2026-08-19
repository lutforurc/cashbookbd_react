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
 * Every control here moves a variable the whole stylesheet is already reading
 * -- see theme/userTheme.ts -- which is why one colour reaches the buttons, the
 * links, the active menu row and the charts at once. Left blank, a colour is
 * not "white", it is "unchosen", and the software's own colour stands.
 */

export type ThemeSetupValues = {
  theme_primary_color?: string;
  theme_secondary_color?: string;
  theme_success_color?: string;
  theme_danger_color?: string;
  theme_warning_color?: string;
  theme_info_color?: string;
  theme_sidebar_color?: string;
  theme_header_color?: string;
  theme_page_bg_color?: string;
  theme_print_color?: string;
  theme_chart_palette?: string;
  theme_mode?: string;
  theme_control_height?: string;
  theme_control_radius?: string;
};

interface ThemeSetupSectionProps {
  values: ThemeSetupValues;
  /** Called with the field name and its new value, ready for the form's state. */
  onChange: (name: keyof ThemeSetupValues, value: string) => void;
}

/**
 * A colour, offered two ways: the swatch for choosing and the hex for typing or
 * pasting the one a brand guide gave someone.
 *
 * Empty means "whatever the software ships with", so the swatch shows that
 * colour without claiming it as a choice, and the arrow puts the field back to
 * empty.
 */
const ColorField: React.FC<{
  label: string;
  value?: string;
  fallback: string;
  help?: string;
  onChange: (value: string) => void;
}> = ({ label, value, fallback, help, onChange }) => (
  <div>
    <label className={`${FIELD_LABEL} text-sm`}>{label}</label>
    <div className="flex items-center gap-2">
      <Input
        type="color"
        value={value || fallback}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass(undefined, 'w-12 shrink-0 cursor-pointer p-1')}
        title={label}
      />
      <Input
        type="text"
        value={value || ''}
        placeholder={`${fallback} (default)`}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass(undefined, 'w-full text-sm')}
      />
      <IconButton
        icon={<FiRotateCcw />}
        title="Back to the software's own colour"
        onClick={() => onChange('')}
        tone="muted"
        className="shrink-0 px-1"
      />
    </div>
    {help ? (
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{help}</p>
    ) : null}
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
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{children}</div>
  </div>
);

const ThemeSetupSection: React.FC<ThemeSetupSectionProps> = ({ values, onChange }) => {
  const color = (
    name: keyof ThemeSetupValues,
    label: string,
    fallback: string,
    help?: string,
  ) => (
    <ColorField
      label={label}
      value={values[name]}
      fallback={fallback}
      help={help}
      onChange={(v) => onChange(name, v)}
    />
  );

  return (
    <div className="md:col-span-2 rounded border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-transparent">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">
          Color and Theme Setup
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          How the software looks for this user. Every box left blank keeps the
          colour the software ships with, and the arrow beside one puts it back.
        </p>
      </div>

      <Group
        title="Meaning"
        note="The colours the software already says things with. Changing one changes it everywhere that thing is said."
      >
        {color('theme_primary_color', 'Brand (Primary)', '#2B5FD9',
          'Buttons, links, the menu row you are on.')}
        {color('theme_secondary_color', 'Secondary', '#7FBEEA',
          'The quieter brand colour, beside the first.')}
        {color('theme_success_color', 'Success', '#17804C',
          'Saved, approved, paid.')}
        {color('theme_danger_color', 'Danger', '#CB3A4C',
          'Deleted, overdue, refused.')}
        {color('theme_warning_color', 'Warning', '#F0A000',
          'Careful -- not wrong yet.')}
        {color('theme_info_color', 'Info', '#2E90E0',
          'A notice that is neither good news nor bad.')}
      </Group>

      <Group
        title="The furniture"
        note="The frame around the work, rather than the work itself."
      >
        {color('theme_sidebar_color', 'Sidebar', '#FFFFFF',
          'The strip down the left.')}
        {color('theme_header_color', 'Header Bar', '#FFFFFF',
          'The bar across the top. Follows the sidebar unless set.')}
        {color('theme_page_bg_color', 'Page Background', '#F4F7FA',
          'The paper the cards sit on.')}
      </Group>

      <Group
        title="Charts and print"
        note="Where colour has a job of its own: telling one line from another, and going onto paper."
      >
        <div className="md:col-span-2">
          <label className={`${FIELD_LABEL} text-sm`} htmlFor="theme_chart_palette">
            Chart Colors
          </label>
          <Input
            id="theme_chart_palette"
            name="theme_chart_palette"
            type="text"
            value={values.theme_chart_palette || ''}
            placeholder="#2B5FD9, #12A66E, #E08A0C, #CB3A4C"
            onChange={(e) => onChange('theme_chart_palette', e.target.value)}
            className={fieldClass(undefined, 'w-full text-sm')}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            The series in order, separated by commas -- up to eight. Give fewer
            and the rest stay as they ship.
          </p>
        </div>

        {color('theme_print_color', 'Report Print Color', '#0B0E12',
          'The headings on a printed report. Figures stay black -- colour costs more to print.')}
      </Group>

      <Group
        title="Size and mode"
        note="Not colour: how big the controls are, and which mode the day starts in."
      >
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

        <div>
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
