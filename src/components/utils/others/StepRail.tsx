import React from 'react';
import { FiCheck } from 'react-icons/fi';

/**
 * The numbered rail down the side of a wizard: Basic Info, Print Setup, and so
 * on, each one a card you can click to jump to.
 *
 * It deliberately does NOT go through the shared Button. A button in this app
 * stands at --control-height, which is the height of a text box -- right for
 * Save and Print, wrong for a card that carries two lines and a numbered disc.
 * Routed through Button, the rail was squashed to 34px and the step names were
 * clipped. So the element here is a plain <button>: the browser still gives it
 * the keyboard and the screen reader, and nothing hands it a height.
 *
 * Its size comes from ITEM_PADDING below and from nothing else. That is the
 * point of this file -- a screen using the rail cannot set the height, because
 * there is no prop for it, and the class list is not its to write.
 */

/** What makes a step tall. The one place this rail's height is decided. */
const ITEM_PADDING = 'px-3 py-2.5';

/** The disc carrying the step number, or a tick once the step is behind you. */
const DISC = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold';

type StepState = 'active' | 'completed' | 'todo';

const CARD: Record<StepState, string> = {
  active: 'border-blue-600 bg-blue-50 text-gray-900 dark:bg-blue-500/10 dark:text-[rgb(var(--c-text))]',
  completed: 'border-green-500 text-green-700 dark:text-green-400',
  todo:
    'border-gray-300 text-gray-600 hover:border-gray-400 ' +
    'dark:border-gray-700 dark:bg-transparent dark:text-gray-300',
};

const DISC_STATE: Record<StepState, string> = {
  active: 'border-blue-600 bg-blue-600 text-white',
  completed: 'border-green-500 text-green-600 dark:text-green-400',
  todo: 'border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400',
};

interface StepRailProps {
  /** The step names, in order. */
  steps: string[];
  /** Which one the wizard is showing, counted from zero. */
  current: number;
  /** Called with the index of the step that was clicked. */
  onSelect: (index: number) => void;
  /** Only the rail's placement in the page -- never its height. */
  className?: string;
}

const StepRail: React.FC<StepRailProps> = ({ steps, current, onSelect, className = '' }) => (
  // A strip that scrolls sideways on a phone; a sticky column from md up.
  <nav
    aria-label="Steps"
    className={`-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:sticky md:top-24 md:flex-col md:self-start md:overflow-visible md:px-0 md:pb-0 ${className}`}
  >
    {steps.map((step, index) => {
      const state: StepState =
        index === current ? 'active' : index < current ? 'completed' : 'todo';

      return (
        <button
          key={step}
          type="button"
          onClick={() => onSelect(index)}
          aria-current={state === 'active' ? 'step' : undefined}
          className={`flex w-52 shrink-0 items-center gap-3 rounded border text-left transition md:w-full ${ITEM_PADDING} ${CARD[state]}`}
        >
          <span className={`${DISC} ${DISC_STATE[state]}`}>
            {state === 'completed' ? <FiCheck /> : index + 1}
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wide opacity-70">
              Step {index + 1}
            </span>
            <span className="block text-sm font-medium leading-tight">{step}</span>
          </span>
        </button>
      );
    })}
  </nav>
);

export default StepRail;
