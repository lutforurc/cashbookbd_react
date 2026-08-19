import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import {
  FiPlus,
  FiTrash2,
  FiBookmark,
  FiCheck,
  FiClock,
  FiEdit2,
  FiSave,
  FiX,
  FiPlay,
  FiSearch,
} from 'react-icons/fi';
import Loader from '../../../../common/Loader';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import InputDatePicker from '../../../utils/fields/DatePicker';
import DropdownCommon from '../../../utils/utils-functions/DropdownCommon';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import { Button, ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { FIELD_LABEL, FIELD_TEXTAREA } from '../../../../theme/fieldStyles';
import httpService from '../../../services/httpService';
import { Textarea } from '../../../utils/fields/FormControls';

interface Person {
  id: number;
  name: string;
}

type TodoStatus = 'pending' | 'in_progress' | 'done';

interface Todo {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  due_date: string;
  color: string;
  is_pinned: boolean;
  is_completed: boolean;
  status: TodoStatus;
  reminder_time?: string;
  assigned_to?: number | null;
  is_assigned?: boolean;
  assignee?: Person | null;
  assigner?: Person | null;
}

interface TodoBuckets {
  today: Todo[];
  upcoming: Todo[];
  /** Filled only by a date-range search; the board is empty while it is not. */
  results: Todo[];
}

const EMPTY_BUCKETS: TodoBuckets = { today: [], upcoming: [], results: [] };

const COLORS = ['#FFE5B4', '#B4E5FF', '#FFB4E5', '#E5FFB4', '#FFE5D9', '#D9E5FF'];

/**
 * Which slice of the board is on show.
 *
 * A private scratchpad and a queue of work other people put there are two
 * different things to look at, even though they share a screen.
 */
const FILTERS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'My own' },
  { key: 'to_me', label: 'Assigned to me' },
  { key: 'by_me', label: 'I assigned' },
];

/** What each state looks like, and what the button that leaves it says. */
const STATUS_STEPS: Record<TodoStatus, { label: string; next: TodoStatus; nextLabel: string }> = {
  pending: { label: 'Pending', next: 'in_progress', nextLabel: 'Start working' },
  in_progress: { label: 'In Progress', next: 'done', nextLabel: 'Mark done' },
  done: { label: 'Done', next: 'pending', nextLabel: 'Reopen' },
};

/** Two letters standing in for a face the app does not have. */
const initials = (name?: string): string =>
  (name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

/**
 * The date the picker holds, in the `Y-m-d` the API stores.
 *
 * Built by hand rather than through toISOString(), which converts to UTC and
 * so hands back yesterday for any evening in Asia/Dhaka -- the same off-by-one
 * the API's date cast had.
 */
const dateToString = (date: Date | null): string => {
  if (!date) return '';

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

/**
 * The clock half of the same picker, as `HH:mm`, or empty at midnight.
 *
 * One field carries both the day a note is due and the hour it should nudge,
 * which needs a way to say "no reminder" -- and that is midnight. A task filed
 * for a day and no particular time lands there on its own, and anybody who
 * genuinely wants a 00:00 alarm is served by 00:15.
 */
const timeToString = (date: Date | null): string => {
  if (!date) return '';

  const hours = date.getHours();
  const minutes = date.getMinutes();

  if (hours === 0 && minutes === 0) return '';

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

/** Walk every bucket, leaving each note where it sits. */
const mapBuckets = (buckets: TodoBuckets, fn: (todo: Todo) => Todo): TodoBuckets => ({
  today: buckets.today.map(fn),
  upcoming: buckets.upcoming.map(fn),
  results: buckets.results.map(fn),
});

const filterBuckets = (buckets: TodoBuckets, keep: (todo: Todo) => boolean): TodoBuckets => ({
  today: buckets.today.filter(keep),
  upcoming: buckets.upcoming.filter(keep),
  results: buckets.results.filter(keep),
});

/**
 * A note's own colour, lit from the top-left.
 *
 * A flat fill reads as a coloured rectangle; paper has a light side. The wash
 * is white at low opacity over the user's colour, so one gradient serves all
 * six swatches without a palette of shades to keep in step with them.
 */
const notePaper = (color: string) => ({
  backgroundColor: color,
  backgroundImage:
    'linear-gradient(150deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.12) 45%, rgba(0,0,0,0.05) 100%)',
});

/**
 * The depth, in CSS rather than in Tailwind classes.
 *
 * A single flat `box-shadow` reads as a card floating over a page; paper on a
 * board has a contact shadow right under its edge, a soft ambient one further
 * out, a lit top edge and a darkened bottom one. That is four shadows plus two
 * insets, which is past what a utility class says well -- and the folded corner
 * needs a pseudo-element, which Tailwind cannot give at all.
 *
 * Rendered once from the screen, the way InputDatePicker carries its own
 * calendar styling.
 */
const NOTE_3D_CSS = `
  /* The first two shadows carry no blur: they are solid ledges under the
     bottom edge, which is how a sheet of paper shows its own thickness. The
     blurred three behind them are the light it casts on the board. */
  .task-note {
    box-shadow:
      0 2px 0 -1px rgba(0, 0, 0, 0.14),
      0 5px 0 -2px rgba(0, 0, 0, 0.10),
      0 3px 4px -1px rgba(16, 24, 40, 0.16),
      0 10px 14px -6px rgba(16, 24, 40, 0.28),
      0 20px 30px -14px rgba(16, 24, 40, 0.42),
      inset 0 1px 0 rgba(255, 255, 255, 0.8),
      inset 0 -12px 18px -14px rgba(0, 0, 0, 0.4);
    transition: box-shadow 0.2s ease;
  }

  /* On a dark board the ambient shadow has to be heavier to be seen at all. */
  .dark .task-note {
    box-shadow:
      0 2px 0 -1px rgba(0, 0, 0, 0.35),
      0 5px 0 -2px rgba(0, 0, 0, 0.3),
      0 4px 6px -1px rgba(0, 0, 0, 0.5),
      0 12px 18px -6px rgba(0, 0, 0, 0.6),
      0 26px 38px -16px rgba(0, 0, 0, 0.85),
      inset 0 1px 0 rgba(255, 255, 255, 0.7),
      inset 0 -12px 18px -14px rgba(0, 0, 0, 0.4);
  }

  .task-note:hover {
    box-shadow:
      0 2px 0 -1px rgba(0, 0, 0, 0.14),
      0 5px 0 -2px rgba(0, 0, 0, 0.10),
      0 6px 8px -2px rgba(16, 24, 40, 0.2),
      0 16px 22px -8px rgba(16, 24, 40, 0.34),
      0 32px 46px -20px rgba(16, 24, 40, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.85),
      inset 0 -12px 18px -14px rgba(0, 0, 0, 0.4);
  }

  .dark .task-note:hover {
    box-shadow:
      0 2px 0 -1px rgba(0, 0, 0, 0.35),
      0 5px 0 -2px rgba(0, 0, 0, 0.3),
      0 6px 10px -2px rgba(0, 0, 0, 0.55),
      0 18px 26px -8px rgba(0, 0, 0, 0.7),
      0 38px 52px -20px rgba(0, 0, 0, 0.9),
      inset 0 1px 0 rgba(255, 255, 255, 0.75),
      inset 0 -12px 18px -14px rgba(0, 0, 0, 0.4);
  }

  /* The bottom-right corner, curling up off the board. */
  .task-note::after {
    content: '';
    position: absolute;
    right: 0;
    bottom: 0;
    width: 26px;
    height: 26px;
    clip-path: polygon(100% 0, 100% 100%, 0 100%);
    background-image: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.45) 0%,
      rgba(0, 0, 0, 0.06) 42%,
      rgba(0, 0, 0, 0.20) 100%
    );
  }
`;

/**
 * A button on a note.
 *
 * The four of them used to be one grey on a 4%-black wash, which over a pastel
 * card is grey on pastel: fine in a mockup, invisible on a board. Two things
 * fix it. Each button sits on its own near-white chip with an edge, so it reads
 * as a control whatever colour the paper under it is; and each carries its
 * action's colour instead of the same grey, so the row is four different things
 * before a single icon has been recognised.
 *
 * Only the layout and the border *width* live here. Every colour -- background,
 * text, border -- comes from the tone below, because a base `bg-white` and a
 * tone's `bg-emerald-600` are both unprefixed utilities and which one wins would
 * be down to the order Tailwind happens to emit them in.
 */
const NOTE_ACTION = [
  'flex h-7 w-7 items-center justify-center rounded-md border',
  'shadow-[0_1px_1px_rgba(0,0,0,0.10)] transition-colors',
  'disabled:cursor-wait disabled:opacity-50',
].join(' ');

/**
 * What each button is made of.
 *
 * A resting button is the near-white chip with a coloured icon; hover fills the
 * chip with that colour. A button standing for a state the note is *already* in
 * -- started, finished, pinned -- is filled from the start, so the note says how
 * far along it is without the footer chips being read.
 *
 * Fixed scale colours (emerald / amber / sky / rose), not the theme's `primary`
 * and `success`: the paper is pastel in both themes, so a token that darkens for
 * the dark board would go muddy here.
 */
const NOTE_ACTION_TONE = {
  /** Pending: nothing has happened yet, and the button starts it. */
  start:
    'border-emerald-600/30 bg-white/85 text-emerald-700 hover:border-emerald-600 hover:bg-emerald-600 hover:text-white',
  /** Under way -- filled blue. The button finishes it. */
  running: 'border-sky-700/40 bg-sky-600 text-white hover:bg-sky-700',
  /** Done -- filled green. The button reopens it. */
  finished: 'border-emerald-700/40 bg-emerald-600 text-white hover:bg-emerald-700',
  pin: 'border-amber-600/30 bg-white/85 text-amber-700 hover:border-amber-600 hover:bg-amber-500 hover:text-white',
  pinned: 'border-amber-600/50 bg-amber-500 text-white hover:bg-amber-600',
  edit: 'border-sky-600/30 bg-white/85 text-sky-700 hover:border-sky-600 hover:bg-sky-600 hover:text-white',
  remove:
    'border-rose-600/30 bg-white/85 text-rose-600 hover:border-rose-600 hover:bg-rose-600 hover:text-white',
} as const;

/**
 * 14px, not 12px, and drawn heavier.
 *
 * Feather's default 2px stroke at 12px square is a few hairlines -- at a glance
 * the tick, the pencil and the bin are the same grey smudge. The extra 2px and
 * the heavier stroke are what make them different shapes.
 */
const NOTE_ICON = 'h-3.5 w-3.5';
const NOTE_ICON_STROKE = 2.4;

/** A person's name on a card: initials in a disc, the name beside it. */
const PersonChip = ({ person, prefix }: { person: Person; prefix: string }) => (
  <span
    className="flex max-w-full items-center gap-1 rounded-full bg-black/10 py-0.5 pl-0.5 pr-2 text-[10px] font-semibold text-gray-800"
    title={`${prefix} ${person.name}`}
  >
    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black/20 text-[8px] font-bold text-gray-800">
      {initials(person.name)}
    </span>
    <span className="truncate">{person.name}</span>
  </span>
);

interface TodoCardProps {
  todo: Todo;
  busy: boolean;
  /** Whether this user wrote the task, which decides what they may change. */
  isAuthor: boolean;
  onAdvanceStatus: (todo: Todo) => void;
  onTogglePin: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
}

/**
 * One note.
 *
 * Declared out here, not inside MyTasks, and memoised. A component defined
 * inside its parent is a brand new type on every render, so React cannot match
 * it to what it drew last time -- it tears every card out of the DOM and builds
 * them again, which is the flicker of the whole board vanishing and returning
 * on each click. At module scope the type is stable, and `memo` then keeps a
 * card from re-rendering at all unless its own row or its own busy flag moved.
 *
 * The paper colour is the user's, so the type on top of it stays dark in both
 * themes -- a `dark:text-white` here would put white text on a pastel card.
 * Everything else is the app's: `rounded-sm` corners, the same as every panel
 * around it.
 *
 * The shape is a note, not a table row: a darker band of the note's own colour
 * along the top edge, the title given room to be the loudest thing on the card,
 * and a footer held to the bottom by `mt-auto` so notes standing side by side
 * line their dates and buttons up however tall the text above them runs.
 *
 * Nothing moves on hover. The card used to lift a couple of pixels, and with
 * notes packed shoulder to shoulder that reads as the board twitching under the
 * cursor rather than as a card responding. Only the shadow answers now -- it
 * deepens, so the note reads as rising without a pixel of it changing place.
 */
const TodoCard = memo(({
  todo,
  busy,
  isAuthor,
  onAdvanceStatus,
  onTogglePin,
  onEdit,
  onDelete,
}: TodoCardProps) => {
  const status = todo.status ?? (todo.is_completed ? 'done' : 'pending');
  const isDone = status === 'done';
  const isOverdue = !isDone && dayjs(todo.due_date).isBefore(dayjs().startOf('day'));
  const step = STATUS_STEPS[status] ?? STATUS_STEPS.pending;

  // Whose card this is, said once: work you gave away names the person who has
  // it, work given to you names the person who asked.
  const person = isAuthor ? todo.assignee : todo.assigner;
  const personPrefix = isAuthor ? 'Assigned to' : 'From';

  return (
    <article
      className={`task-note group relative flex h-full min-h-22 flex-col overflow-hidden rounded-sm px-3.5 pb-2.5 pt-4 ${
        isDone ? 'saturate-50' : ''
      }`}
      style={notePaper(todo.color)}
    >
      {/* The note's own colour, deepened -- one rule for all six swatches.
          A task somebody else is involved in wears the brand blue instead, so
          shared work is told apart from a private note at a glance. */}
      <span
        className={`absolute inset-x-0 top-0 h-1 ${todo.is_assigned ? 'bg-primary' : 'bg-black/15'}`}
      />

      {/* Amber, the same as the pin button below, so the badge and the button
          that set it are visibly the same thing. */}
      {todo.is_pinned ? (
        <span
          className="absolute right-3 top-3.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-[0_1px_2px_rgba(0,0,0,0.25)]"
          title="Pinned"
        >
          <FiBookmark className="h-3 w-3" strokeWidth={NOTE_ICON_STROKE} fill="currentColor" />
        </span>
      ) : null}

      <h3
        className={`line-clamp-2 pr-6 text-sm font-semibold leading-snug ${
          isDone ? 'text-gray-500 line-through decoration-gray-500/60' : 'text-gray-900'
        }`}
        title={todo.title}
      >
        {todo.title}
      </h3>

      {todo.description ? (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-700/90">
          {todo.description}
        </p>
      ) : null}

      {person ? (
        <div className="mt-1.5 flex">
          <PersonChip person={person} prefix={personPrefix} />
        </div>
      ) : null}

      {/* Two weights of chip, and the difference is the point. The day and the
          hour are the quiet ones: a 10%-black wash under near-black type. The
          state is the loud one -- solid colour, white type -- because a tint at
          15% over pastel paper lands within a shade or two of the paper itself,
          which is what made "Done" and "In Progress" hard to pick out. It wears
          the same colour as the button that set it. */}
      {/* `whitespace-nowrap` on every chip, and the wrapping done by the rows
          instead. Without it a narrow card breaks the text *inside* a chip --
          "16 Aug / 2026", "IN / PROGRESS" -- which is two lines of nonsense
          where the honest answer is to move a whole chip down. The footer wraps
          the same way: chips first, buttons under them, once there is no room
          for both side by side. */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-1 text-[10px] font-semibold">
          <span
            className={`whitespace-nowrap rounded-sm px-1.5 py-0.5 ${
              isOverdue
                ? 'bg-danger text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)]'
                : 'bg-black/10 text-gray-800'
            }`}
          >
            {dayjs(todo.due_date).format('DD MMM YYYY')}
          </span>

          {todo.reminder_time ? (
            <span className="flex items-center gap-1 whitespace-nowrap rounded-sm bg-black/10 px-1.5 py-0.5 text-gray-800">
              <FiClock className="h-3 w-3" strokeWidth={NOTE_ICON_STROKE} />
              {dayjs(todo.reminder_time).format('hh:mm A')}
            </span>
          ) : null}

          {/* Pending is the resting state and says nothing worth the room.
              Sentence case, not uppercase: "IN PROGRESS" with letter-spacing is
              half again as wide as "In Progress", and on a half-width card that
              width is what pushed the footer onto a second line. */}
          {status !== 'pending' ? (
            <span
              className={`flex items-center gap-1 whitespace-nowrap rounded-sm px-1.5 py-0.5 text-white shadow-[0_1px_1px_rgba(0,0,0,0.2)] ${
                isDone ? 'bg-emerald-600' : 'bg-sky-600'
              }`}
            >
              {/* A filled disc for work under way, a tick for work finished --
                  so the two chips differ in shape as well as in hue, for
                  anyone who does not separate green from blue. */}
              {isDone ? (
                <FiCheck className="h-2.5 w-2.5" strokeWidth={3.5} />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
              )}
              {step.label}
            </span>
          ) : null}
        </div>

        {/* No longer dimmed at rest. The dimming was there to keep a wall of
            notes reading as writing, but a 60%-opacity grey icon on pastel paper
            is not quiet, it is unreadable. The chips are near-white and only
            their icon is coloured, which is quiet enough; the colour floods in
            on hover. */}
        <div className="flex shrink-0 gap-1.5">
          {/* One button walks the task forward: start it, finish it, reopen
              it. Three states need no more than that. */}
          <Button
            type="button"
            onClick={() => onAdvanceStatus(todo)}
            disabled={busy}
            className={`${NOTE_ACTION} ${
              isDone
                ? NOTE_ACTION_TONE.finished
                : status === 'in_progress'
                  ? NOTE_ACTION_TONE.running
                  : NOTE_ACTION_TONE.start
            }`}
            title={step.nextLabel}
          >
            {status === 'pending' ? (
              <FiPlay className={NOTE_ICON} strokeWidth={NOTE_ICON_STROKE} />
            ) : (
              <FiCheck className={NOTE_ICON} strokeWidth={3} />
            )}
          </Button>

          <Button
            type="button"
            onClick={() => onTogglePin(todo)}
            disabled={busy}
            className={`${NOTE_ACTION} ${
              todo.is_pinned ? NOTE_ACTION_TONE.pinned : NOTE_ACTION_TONE.pin
            }`}
            title={todo.is_pinned ? 'Unpin' : 'Pin'}
          >
            {/* Filled once pinned: a hollow outline and a filled one are told
                apart at this size, two shades of the same outline are not. */}
            <FiBookmark
              className={NOTE_ICON}
              strokeWidth={NOTE_ICON_STROKE}
              fill={todo.is_pinned ? 'currentColor' : 'none'}
            />
          </Button>

          {/* What the task *says* belongs to whoever wrote it. The person it
              was handed to moves it along and pins it, and that is all -- a
              button that 403s on click is worse than no button. */}
          {isAuthor ? (
            <>
              <Button
                type="button"
                onClick={() => onEdit(todo)}
                disabled={busy}
                className={`${NOTE_ACTION} ${NOTE_ACTION_TONE.edit}`}
                title="Edit"
              >
                <FiEdit2 className={NOTE_ICON} strokeWidth={NOTE_ICON_STROKE} />
              </Button>

              <Button
                type="button"
                onClick={() => onDelete(todo)}
                disabled={busy}
                className={`${NOTE_ACTION} ${NOTE_ACTION_TONE.remove}`}
                title="Delete"
              >
                <FiTrash2 className={NOTE_ICON} strokeWidth={NOTE_ICON_STROKE} />
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
});

interface TodoFormModalProps {
  /** The note being changed, or null to write a new one. */
  todo: Todo | null;
  saving: boolean;
  people: Person[];
  onCancel: () => void;
  onSave: (todo: Todo | null, values: Record<string, any>) => void;
}

/**
 * The form, for both writing a note and changing one.
 *
 * One dialog rather than two forms. New and Edit ask for exactly the same five
 * things, and the panel that used to sit across the top of the board asked for
 * them a second time in its own markup -- so a field added to one had to be
 * remembered into the other, and the board opened on a form instead of on the
 * work. The board is the screen now; writing is a click away.
 *
 * Mounted fresh each time (the caller keys it), so the fields seed from the row
 * -- or from today, in brand colour, unassigned -- and there is no stale state
 * to reconcile.
 */
const TodoFormModal = ({ todo, saving, people, onCancel, onSave }: TodoFormModalProps) => {
  const isNew = todo === null;

  const [title, setTitle] = useState(todo?.title ?? '');
  const [description, setDescription] = useState(todo?.description ?? '');
  const [color, setColor] = useState(todo?.color ?? COLORS[0]);
  const [assignedTo, setAssignedTo] = useState(String(todo?.assigned_to ?? ''));
  // One field again: the day, carrying the reminder's hour when there is one.
  // A new note opens on today at midnight -- the day filled in, no reminder.
  const [dueMoment, setDueMoment] = useState<Date | null>(() => {
    if (!todo) return dayjs().startOf('day').toDate();

    return todo.reminder_time
      ? new Date(todo.reminder_time)
      : dayjs(todo.due_date).startOf('day').toDate();
  });

  const dueDate = dateToString(dueMoment);
  const canSave = Boolean(title.trim()) && Boolean(dueDate) && !saving;

  const submit = () => {
    if (!canSave) return;

    const dueTime = timeToString(dueMoment);

    onSave(todo, {
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate,
      color,
      reminder_time: dueTime ? `${dueDate} ${dueTime}:00` : null,
      assigned_to: assignedTo ? Number(assignedTo) : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-lg border border-stroke bg-white text-slate-800 shadow-2xl dark:border-form-strokedark dark:bg-graydark dark:text-white">
        <h3 className="border-b border-stroke px-5 py-3 text-lg font-semibold text-black dark:border-form-strokedark dark:text-white">
          {isNew ? 'New Task' : 'Edit Task'}
        </h3>

        <div className="grid gap-3 px-5 py-4">
          <InputElement
 id="todo_title"
 name="todo_title"
 label="Task"
 placeholder="What do you want to do?"
 value={title}
 className="mb-0 "
 onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />

          <div className="flex flex-col text-left">
            <label className={`${FIELD_LABEL} text-sm`} htmlFor="todo_description">
              Description
            </label>
            <Textarea
              id="todo_description"
              name="todo_description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything worth remembering about it (optional)"
              className={`${FIELD_TEXTAREA} w-full resize-y px-3 py-2 text-sm`}
            />
          </div>

          <InputDatePicker
 id="todo_due_date"
 name="todo_due_date"
 label="Due Date & Reminder"
 showTime
 selectedDate={dueMoment}
 setSelectedDate={setDueMoment}
 setCurrentDate={setDueMoment}
 className="w-full"
          />

          <DropdownCommon
            id="todo_assigned_to"
            name="todo_assigned_to"
            label="Assign to"
            value={assignedTo}
            data={[{ id: '', name: 'Myself (personal note)' }, ...people]}
            onChange={(e) => setAssignedTo(e.target.value)}
            className=""
            description="Handing this to somebody else puts it on their board too."
          />

          <div className="flex flex-col text-left">
            <label className={`${FIELD_LABEL} text-sm`}>Colour</label>
            <div className="flex h-9 items-center gap-1.5">
              {COLORS.map((swatch) => (
                <Button
                  key={swatch}
                  type="button"
                  onClick={() => setColor(swatch)}
                  title="Use this colour"
                  className={`h-6 w-6 rounded-sm border transition-colors ${
                    color === swatch
                      ? 'border-primary ring-1 ring-primary'
                      : 'border-stroke dark:border-strokedark'
                  }`}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-stroke px-5 py-4 dark:border-form-strokedark">
          <ButtonLoading
            onClick={onCancel}
            label="Cancel"
            disabled={saving}
            className="whitespace-nowrap bg-slate-500 hover:bg-slate-600 dark:bg-gray-500 dark:hover:bg-gray-600"
            icon={<FiX className="mr-2 text-lg" />}
          />
          <ButtonLoading
            onClick={submit}
            label={isNew ? 'Add Task' : 'Save'}
            variant="primary"
            buttonLoading={saving}
            disabled={!canSave}
            className="whitespace-nowrap"
            icon={
              isNew ? (
                <FiPlus className="mr-2 text-lg text-white" />
              ) : (
                <FiSave className="mr-2 text-lg text-white" />
              )
            }
          />
        </div>
      </div>
    </div>
  );
};

interface SectionProps extends Omit<TodoCardProps, 'todo' | 'busy' | 'isAuthor'> {
  title: string;
  items: Todo[];
  busyId: number | null;
  /** Who is looking, so each card knows whether they wrote it. */
  meId: number;
}

/**
 * Notes are short, so a single column down the middle of a wide screen wasted
 * most of it. Two across from `sm`, three from `xl`.
 */
const Section = ({ title, items, busyId, meId, ...handlers }: SectionProps) =>
  items.length === 0 ? null : (
    <div className="mb-9">
      {/* A rule running out from the heading ties the row of notes under it
          together and separates it from the row above without a box. */}
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-body dark:text-bodydark">
          {title}
        </h2>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
          {items.length}
        </span>
        <span className="h-px flex-1 bg-stroke dark:bg-strokedark" />
      </div>

      {/* Two across, so a note is half the width of the panel above it. Three
          columns cut each one to a third and they read as table cells. */}
      <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2">
        {items.map((todo) => (
          <TodoCard
            key={todo.id}
            todo={todo}
            busy={busyId === todo.id}
            isAuthor={Number(todo.user_id) === meId}
            {...handlers}
          />
        ))}
      </div>
    </div>
  );

export default function MyTasks() {
  const meId = Number(useSelector((state: any) => state.auth?.me?.id) || 0);

  const [todos, setTodos] = useState<TodoBuckets>(EMPTY_BUCKETS);
  /**
   * Whether the very first load has happened.
   *
   * Only that one gets the full-screen loader. Every load after it -- a filter,
   * a search -- keeps what is on screen and swaps it when the answer arrives,
   * because `Loader` is a fixed overlay: reaching for it mid-session blanks the
   * whole page, form and all, and then paints it back.
   */
  const loadedOnce = useRef(false);
  /** Everyone in the company a task can be handed to. */
  const [people, setPeople] = useState<Person[]>([]);
  const [filter, setFilter] = useState('all');
  /**
   * The range being searched, or nulls for the ordinary board.
   *
   * `range` is what the last search actually asked for; the two pickers hold
   * what is being typed. Keeping them apart means editing a date does not
   * re-run the query until the button is pressed, and clearing the pickers does
   * not silently drop the results already on screen.
   */
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(false);
  /** A quieter load: the cards stay put and the Search button spins. */
  const [refreshing, setRefreshing] = useState(false);
  /** The one note a request is in flight for -- only its buttons go quiet. */
  const [busyId, setBusyId] = useState<number | null>(null);
  /** The note the delete dialog is asking about, or null when it is closed. */
  const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);
  const [deleting, setDeleting] = useState(false);
  /**
   * The form dialog: closed, open on a note, or open on nothing at all.
   *
   * `undefined` is closed and `null` is a new note, which is the one honest way
   * to say "open, editing nothing" without a second boolean that could disagree
   * with this one.
   */
  const [formFor, setFormFor] = useState<Todo | null | undefined>(undefined);
  const [savingForm, setSavingForm] = useState(false);

  // Refetched on a filter or range change: which rows qualify is the server's
  // answer, not something to work out again on this side from a list it did not
  // send.
  useEffect(() => {
    fetchTodos({ silent: loadedOnce.current });
    loadedOnce.current = true;
  }, [filter, range]);

  useEffect(() => {
    httpService
      .get('/user-todos/assignees')
      .then((res) => {
        const payload = res.data?.data;
        setPeople(Array.isArray(payload) ? payload : (payload?.data ?? []));
      })
      .catch(() => setPeople([]));
  }, []);

  /**
   * `silent` keeps the notes already on screen while the new list arrives.
   * The full-screen loader belongs to the first load only -- swapping the whole
   * board for a spinner after every tick made every card blink away and back.
   */
  const fetchTodos = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await httpService.get('/user-todos', {
        params: {
          filter,
          date_from: range?.from || undefined,
          date_to: range?.to || undefined,
        },
      });
      // The API envelope nests the payload one level deeper
      // ({ data: { data: {...}, transaction_date } }); tolerate a flat shape
      // too so either form renders.
      const payload = res.data?.data;
      const data = payload?.today || payload?.upcoming ? payload : payload?.data;

      setTodos({
        today: data?.today ?? [],
        upcoming: data?.upcoming ?? [],
        results: data?.results ?? [],
      });
    } catch (err: any) {
      if (!silent) setTodos(EMPTY_BUCKETS);
      if (!err?.toastReported) {
        toast.error('Failed to load tasks.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, range]);

  /**
   * Run the search.
   *
   * Either end on its own is a sensible question -- everything since a date,
   * everything up to one -- so only both being empty means "no search". Dates
   * the wrong way round are swapped rather than refused; it is obvious what was
   * meant, and an error message here would only be pedantry.
   */
  const runSearch = () => {
    if (!fromDate && !toDate) {
      setRange(null);
      return;
    }

    const from = dateToString(fromDate);
    const to = dateToString(toDate);
    const flipped = from && to && from > to;

    setRange({
      from: flipped ? to : from,
      to: flipped ? from : to,
    });
  };

  const clearSearch = () => {
    setFromDate(null);
    setToDate(null);
    setRange(null);
  };

  /**
   * Write a new note.
   *
   * The dialog stays open and keeps the typing if the save fails -- the one
   * thing a form owes somebody who has just written something.
   */
  const createTodo = async (values: Record<string, any>) => {
    setSavingForm(true);
    try {
      await httpService.post('/user-todos', values);

      if (values.assigned_to) {
        const person = people.find((p) => p.id === Number(values.assigned_to));
        toast.success(`Task assigned to ${person?.name ?? 'them'}.`);
      }

      setFormFor(undefined);
      await fetchTodos({ silent: true });
    } catch (err: any) {
      if (!err?.toastReported) {
        toast.error(err?.response?.data?.message || 'Failed to add task.');
      }
    } finally {
      setSavingForm(false);
    }
  };

  /**
   * One writer for every field flip, so pin and complete cannot drift apart.
   *
   * The change lands in state first and the note is rewritten where it stands
   * -- no reload of the board, so the other notes neither move nor blink. The
   * server's own copy of the row replaces it when the request comes back, and
   * the row we were handed goes back if it fails.
   *
   * Every update runs through the setter's own `prev` rather than through the
   * `todos` in scope, so these handlers hold no dependency on the list. Their
   * identity stays put, which is what lets the memoised cards ignore a render
   * that had nothing to do with them.
   *
   * A note therefore keeps its section until the next load: completing an
   * overdue task ticks it in place rather than yanking it out from under the
   * cursor. That is the point.
   */
  const patchTodo = useCallback(async (todo: Todo, changes: Record<string, any>) => {
    setBusyId(todo.id);
    setTodos((prev) => mapBuckets(prev, (t) => (t.id === todo.id ? { ...t, ...changes } : t)));

    try {
      const res = await httpService.patch(`/user-todos/${todo.id}`, changes);
      const saved = res.data?.data?.data ?? res.data?.data;

      if (saved?.id) {
        setTodos((prev) => mapBuckets(prev, (t) => (t.id === saved.id ? saved : t)));
      }

      return true;
    } catch (err: any) {
      setTodos((prev) => mapBuckets(prev, (t) => (t.id === todo.id ? todo : t)));
      if (!err?.toastReported) {
        toast.error(err?.response?.data?.message || 'Failed to update task.');
      }

      return false;
    } finally {
      setBusyId(null);
    }
  }, []);

  const togglePin = useCallback(
    (todo: Todo) => patchTodo(todo, { is_pinned: !todo.is_pinned }),
    [patchTodo],
  );

  /**
   * Pending → In Progress → Done → Pending.
   *
   * One button rather than three: a task only ever moves to the next thing, and
   * the one case for going backwards -- reopening something finished -- is the
   * step after Done.
   */
  const advanceStatus = useCallback(
    (todo: Todo) => {
      const status = todo.status ?? (todo.is_completed ? 'done' : 'pending');
      const next = (STATUS_STEPS[status] ?? STATUS_STEPS.pending).next;

      return patchTodo(todo, { status: next, is_completed: next === 'done' });
    },
    [patchTodo],
  );

  const openEditor = useCallback((todo: Todo) => setFormFor(todo), []);

  /**
   * The dialog's one save, whichever it was opened for.
   *
   * It closes only once the row is written. A failure leaves it open with the
   * typing still in it.
   */
  const submitForm = useCallback(
    async (todo: Todo | null, values: Record<string, any>) => {
      if (!todo) return createTodo(values);

      setSavingForm(true);
      const saved = await patchTodo(todo, values);
      setSavingForm(false);

      if (saved) setFormFor(undefined);
    },
    [patchTodo, createTodo],
  );

  /** Asking is the app's own dialog, not the browser's grey alert box. */
  const askDelete = useCallback((todo: Todo) => setTodoToDelete(todo), []);

  const confirmDelete = useCallback(async () => {
    const todo = todoToDelete;
    if (!todo) return;

    setDeleting(true);
    setBusyId(todo.id);

    try {
      await httpService.delete(`/user-todos/${todo.id}`);
      // Only the deleted note leaves; the rest stay exactly where they are.
      setTodos((prev) => filterBuckets(prev, (t) => t.id !== todo.id));
      setTodoToDelete(null);
    } catch (err: any) {
      if (!err?.toastReported) {
        toast.error(err?.response?.data?.message || 'Failed to delete task.');
      }
    } finally {
      setDeleting(false);
      setBusyId(null);
    }
  }, [todoToDelete]);

  const searching = range !== null;
  const isEmpty = searching
    ? todos.results.length === 0
    : todos.today.length === 0 && todos.upcoming.length === 0;

  // Says which dates the list on screen answers to, since one end may be open.
  const rangeLabel = !range
    ? ''
    : range.from && range.to
      ? `${dayjs(range.from).format('DD MMM YYYY')} — ${dayjs(range.to).format('DD MMM YYYY')}`
      : range.from
        ? `from ${dayjs(range.from).format('DD MMM YYYY')}`
        : `up to ${dayjs(range.to).format('DD MMM YYYY')}`;

  // One stable object, so a card's props only change when the card does.
  const cardHandlers = useMemo(
    () => ({
      onAdvanceStatus: advanceStatus,
      onTogglePin: togglePin,
      onEdit: openEditor,
      onDelete: askDelete,
    }),
    [advanceStatus, togglePin, openEditor, askDelete],
  );

  return (
    <div>
      <HelmetTitle title="My Tasks" />
      <style>{NOTE_3D_CSS}</style>

      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* New Task first, then whose work is whose, and on the right the way
            back to anything the board no longer shows. The board is today and
            ahead only -- a past task is found by asking for its dates.

            The form used to sit across the top of this page, so the screen
            opened on a form rather than on the work. It is a dialog now. */}
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          {/* `h-9` is the app's field height, which is what the pickers and
              buttons opposite stand at -- and `items-end` on the row then lines
              all of them up on one baseline, under the pickers' labels. */}
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLoading
              onClick={() => setFormFor(null)}
              label="New Task"
              variant="primary"
              className="mr-1 whitespace-nowrap"
              icon={<FiPlus className="mr-2 text-lg" />}
            />

            {FILTERS.map((option) => (
              <Button
                key={option.key}
                type="button"
                onClick={() => setFilter(option.key)}
                className={`flex items-center rounded-sm border px-3 text-xs font-medium transition-colors ${
 filter === option.key
 ?'border-primary bg-primary text-white':'border-stroke bg-white text-body hover:border-primary hover:text-primary dark:border-strokedark dark:bg-boxdark dark:text-bodydark'}`}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="w-36">
              <InputDatePicker
 id="search_from"
 name="search_from"
 label="From"
 placeholder="From date"
 selectedDate={fromDate}
 setSelectedDate={setFromDate}
 setCurrentDate={setFromDate}
 className="w-full text-sm"
              />
            </div>

            <div className="w-36">
              <InputDatePicker
 id="search_to"
 name="search_to"
 label="To"
 placeholder="To date"
 selectedDate={toDate}
 setSelectedDate={setToDate}
 setCurrentDate={setToDate}
 className="w-full text-sm"
              />
            </div>

            {/* Full size, not `sm`: the small variant's `px-2` left the label
                almost against the right edge once an icon had pushed it over. */}
            <ButtonLoading
              onClick={runSearch}
              label="Search"
              buttonLoading={refreshing}
              className="whitespace-nowrap"
              icon={<FiSearch className="mr-2 text-base" />}
            />

            {/* Only worth the room once there is something to come back from. */}
            {searching ? (
              <ButtonLoading
                onClick={clearSearch}
                label="Clear"
                variant="ghost"
                className="whitespace-nowrap border border-stroke dark:border-strokedark"
                icon={<FiX className="mr-2 text-base" />}
              />
            ) : null}
          </div>
        </div>

        {loading ? (
          <Loader />
        ) : (
          <>
            {searching ? (
              // A range is one list, not a day-by-day board: the sections it
              // would split into stop meaning anything once the dates are named.
              <Section
                title={`Found ${rangeLabel}`}
                items={todos.results}
                busyId={busyId}
                meId={meId}
                {...cardHandlers}
              />
            ) : (
              <>
                <Section
                  title="Today"
                  items={todos.today}
                  busyId={busyId}
                  meId={meId}
                  {...cardHandlers}
                />
                <Section
                  title="Upcoming"
                  items={todos.upcoming}
                  busyId={busyId}
                  meId={meId}
                  {...cardHandlers}
                />
              </>
            )}

            {isEmpty && (
              <div className="rounded-sm border border-dashed border-stroke py-14 text-center dark:border-strokedark">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {searching
                    ? `No data found ${rangeLabel ? `for ${rangeLabel}` : 'for those dates'}.`
                    : filter === 'all'
                      ? 'Nothing due today or ahead. Write one with New Task, or search a date range for older ones.'
                      : 'Nothing here under this filter.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Keyed so each note -- and each blank one -- opens the dialog with its
          own values rather than the last one's. */}
      {formFor !== undefined ? (
        <TodoFormModal
          key={formFor?.id ?? 'new'}
          todo={formFor}
          saving={savingForm}
          people={people}
          onCancel={() => setFormFor(undefined)}
          onSave={submitForm}
        />
      ) : null}

      <ConfirmModal
        show={todoToDelete !== null}
        title="Confirm Deletion"
        message={
          <>
            Are you sure you want to delete this task?
            <span className="mt-1 block font-bold">{todoToDelete?.title}</span>
          </>
        }
        loading={deleting}
        onCancel={() => setTodoToDelete(null)}
        onConfirm={confirmDelete}
        className="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
}
