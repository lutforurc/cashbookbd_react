import { ReactNode } from 'react';
import { FiArrowLeft, FiArrowRight, FiCheck } from 'react-icons/fi';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

/**
 * A long form split into numbered steps: a row of step tabs on top, Back /
 * Next at the bottom, and the caller's own Save on the last step.
 *
 * The caller keeps every step mounted and only hides the others (see
 * `stepClass`) -- several fields are uncontrolled (defaultValue), and
 * unmounting them would lose what was typed.
 */
type NavProps = { steps: string[]; current: number; onSelect: (index: number) => void };

/**
 * Tabs that read as a stepper: a strip of tabs joined by a progress line.
 * Done steps carry a check, the current one is lifted like an open tab with a
 * bar under it, and the ones ahead stay quiet. Every tab is clickable -- the
 * steps are a way to find fields, not a gate.
 */
export const StepNav = ({ steps, current, onSelect }: NavProps) => (
  <nav
    aria-label="Form steps"
    className="mb-4 flex items-stretch rounded-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-1.5"
  >
    {steps.map((title, index) => {
      const active = index === current;
      const done = index < current;
      return (
        <div key={title} className="flex min-w-0 flex-1 items-center">
          <button
            type="button"
            aria-current={active ? 'step' : undefined}
            onClick={() => onSelect(index)}
            className={`relative flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded px-2 py-2.5 text-center transition-colors sm:flex-row sm:gap-3 sm:px-3 sm:text-left ${
              active ? 'bg-primary/10 shadow-sm' : 'hover:bg-primary/5'
            }`}
          >
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors ${
                active
                  ? 'bg-primary text-white ring-4 ring-primary/20'
                  : done
                    ? 'bg-primary text-white'
                    : 'border-2 border-[rgb(var(--c-border))] text-[rgb(var(--c-text-muted))]'
              }`}
            >
              {done ? <FiCheck className="h-4 w-4" /> : index + 1}
            </span>
            <span className="w-full min-w-0 sm:w-auto">
              <span className="block text-[11px] uppercase tracking-wide text-[rgb(var(--c-text-muted))]">
                Step {index + 1}
                <span className="hidden sm:inline">{active ? ' · Current' : done ? ' · Done' : ''}</span>
              </span>
              <span
                className={`block break-words text-[11px] font-semibold leading-tight sm:truncate sm:text-sm ${
                  active || done ? 'text-[rgb(var(--c-text))]' : 'text-[rgb(var(--c-text-muted))]'
                }`}
              >
                {title}
              </span>
            </span>
            {/* The open tab's underline. */}
            {active && <span className="absolute inset-x-3 -bottom-1.5 h-0.5 rounded-full bg-primary" />}
          </button>
          {index < steps.length - 1 && (
            <span
              aria-hidden="true"
              className={`mx-1 hidden h-0.5 w-6 shrink-0 rounded-full md:block lg:w-10 ${done ? 'bg-primary' : 'bg-[rgb(var(--c-border))]'}`}
            />
          )}
        </div>
      );
    })}
  </nav>
);

/** The bordered card the step panels and footer sit in, headed by the step's title. */
export const StepCard = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="rounded-md border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-4 sm:p-6">
    <h2 className="mb-4 text-lg font-semibold text-[rgb(var(--c-text))]">{title}</h2>
    {children}
  </div>
);

/** Grid classes for one step's panel: shown when current, hidden otherwise. */
export const stepClass = (index: number, current: number) =>
  index === current ? 'grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3' : 'hidden';

type FooterProps = { steps: string[]; current: number; onChange: (index: number) => void; finish: ReactNode; extra?: ReactNode };

/** Back on the left; Next, or the caller's Save on the last step, on the right. */
export const StepFooter = ({ steps, current, onChange, finish, extra }: FooterProps) => (
  <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-[rgb(var(--c-border))] pt-4">
    <div className={current === 0 ? 'invisible' : ''}>
      <ButtonLoading type="button" onClick={() => onChange(current - 1)} label="Back" className="whitespace-nowrap" icon={<FiArrowLeft className="mr-2" />} />
    </div>
    <div className="flex flex-wrap gap-2">
      {extra}
      {current < steps.length - 1 ? (
        <ButtonLoading type="button" variant="primary" onClick={() => onChange(current + 1)} label="Next" className="whitespace-nowrap" icon={<FiArrowRight className="mr-2" />} />
      ) : (
        finish
      )}
    </div>
  </div>
);
