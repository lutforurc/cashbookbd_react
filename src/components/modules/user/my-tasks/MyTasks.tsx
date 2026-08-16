import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiBookmark, FiCheck, FiClock, FiEdit2, FiSave, FiX } from 'react-icons/fi';
import Loader from '../../../../common/Loader';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import InputElement from '../../../utils/fields/InputElement';
import InputDatePicker from '../../../utils/fields/DatePicker';
import ConfirmModal from '../../../utils/components/ConfirmModalProps';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import { FIELD_LABEL, FIELD_TEXTAREA } from '../../../../theme/fieldStyles';
import httpService from '../../../services/httpService';

interface Todo {
  id: number;
  title: string;
  description?: string;
  due_date: string;
  color: string;
  is_pinned: boolean;
  is_completed: boolean;
  reminder_time?: string;
}

interface TodoBuckets {
  overdue: Todo[];
  today: Todo[];
  upcoming: Todo[];
}

const EMPTY_BUCKETS: TodoBuckets = { overdue: [], today: [], upcoming: [] };

const COLORS = ['#FFE5B4', '#B4E5FF', '#FFB4E5', '#E5FFB4', '#FFE5D9', '#D9E5FF'];

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
  overdue: buckets.overdue.map(fn),
  today: buckets.today.map(fn),
  upcoming: buckets.upcoming.map(fn),
});

const filterBuckets = (buckets: TodoBuckets, keep: (todo: Todo) => boolean): TodoBuckets => ({
  overdue: buckets.overdue.filter(keep),
  today: buckets.today.filter(keep),
  upcoming: buckets.upcoming.filter(keep),
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

const NOTE_ACTION = [
  'flex h-6 w-6 items-center justify-center rounded-sm text-gray-600',
  'bg-black/[0.04] transition-colors hover:bg-black/10 hover:text-gray-900',
  'disabled:cursor-wait disabled:opacity-50',
].join(' ');

interface TodoCardProps {
  todo: Todo;
  busy: boolean;
  onToggleComplete: (todo: Todo) => void;
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
  onToggleComplete,
  onTogglePin,
  onEdit,
  onDelete,
}: TodoCardProps) => {
  const isOverdue = !todo.is_completed && dayjs(todo.due_date).isBefore(dayjs().startOf('day'));

  return (
    <article
      className={`task-note group relative flex h-full min-h-[5.5rem] flex-col overflow-hidden rounded-sm px-3.5 pb-2.5 pt-4 ${
        todo.is_completed ? 'saturate-50' : ''
      }`}
      style={notePaper(todo.color)}
    >
      {/* The note's own colour, deepened -- one rule for all six swatches. */}
      <span className="absolute inset-x-0 top-0 h-1 bg-black/15" />

      {todo.is_pinned ? (
        <span
          className="absolute right-3 top-3.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/15 text-gray-800"
          title="Pinned"
        >
          <FiBookmark className="h-3 w-3" />
        </span>
      ) : null}

      <h3
        className={`line-clamp-2 pr-6 text-sm font-semibold leading-snug ${
          todo.is_completed ? 'text-gray-500 line-through decoration-gray-500/60' : 'text-gray-900'
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

      <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
        <div className="flex items-center gap-1 text-[10px] font-medium">
          <span
            className={`rounded-sm px-1.5 py-0.5 ${
              isOverdue ? 'bg-danger/15 text-danger' : 'bg-black/[0.07] text-gray-700'
            }`}
          >
            {dayjs(todo.due_date).format('DD MMM YYYY')}
          </span>

          {todo.reminder_time ? (
            <span className="flex items-center gap-1 rounded-sm bg-black/[0.07] px-1.5 py-0.5 text-gray-700">
              <FiClock className="h-3 w-3" />
              {dayjs(todo.reminder_time).format('hh:mm A')}
            </span>
          ) : null}
        </div>

        {/* Quiet until the note is pointed at, so a wall of them reads as
            writing rather than as rows of buttons. */}
        <div className="flex gap-1 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => onToggleComplete(todo)}
            disabled={busy}
            className={`${NOTE_ACTION} ${todo.is_completed ? 'bg-success/20 text-success' : ''}`}
            title={todo.is_completed ? 'Mark incomplete' : 'Mark complete'}
          >
            <FiCheck className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={() => onTogglePin(todo)}
            disabled={busy}
            className={`${NOTE_ACTION} ${todo.is_pinned ? 'bg-black/15 text-gray-900' : ''}`}
            title={todo.is_pinned ? 'Unpin' : 'Pin'}
          >
            <FiBookmark className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={() => onEdit(todo)}
            disabled={busy}
            className={NOTE_ACTION}
            title="Edit"
          >
            <FiEdit2 className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(todo)}
            disabled={busy}
            className={`${NOTE_ACTION} hover:bg-danger hover:text-white`}
            title="Delete"
          >
            <FiTrash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </article>
  );
});

interface EditTodoModalProps {
  todo: Todo;
  saving: boolean;
  onCancel: () => void;
  onSave: (todo: Todo, changes: Record<string, any>) => void;
}

/**
 * The note, opened up.
 *
 * A sticky note is a small thing to edit in place -- four fields would double
 * the height of every card on the board for the sake of the one being changed
 * -- so it opens in the same dialog shape ConfirmModal uses, and the board
 * behind it does not move at all.
 *
 * Mounted fresh per note (the caller keys it by id), so the fields simply seed
 * from the row and there is no stale state to reconcile.
 */
const EditTodoModal = ({ todo, saving, onCancel, onSave }: EditTodoModalProps) => {
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description ?? '');
  const [color, setColor] = useState(todo.color);
  // One field again: the day, carrying the reminder's hour when there is one.
  const [dueMoment, setDueMoment] = useState<Date | null>(
    todo.reminder_time
      ? new Date(todo.reminder_time)
      : dayjs(todo.due_date).startOf('day').toDate(),
  );

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
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-lg border border-stroke bg-white text-slate-800 shadow-2xl dark:border-form-strokedark dark:bg-graydark dark:text-white">
        <h3 className="border-b border-stroke px-5 py-3 text-lg font-semibold text-black dark:border-form-strokedark dark:text-white">
          Edit Task
        </h3>

        <div className="grid gap-3 px-5 py-4">
          <InputElement
            id="edit_title"
            name="edit_title"
            label="Task"
            placeholder="What do you want to do?"
            value={title}
            className="mb-0 h-9"
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />

          <div className="flex flex-col text-left">
            <label className={`${FIELD_LABEL} text-sm`} htmlFor="edit_description">
              Description
            </label>
            <textarea
              id="edit_description"
              name="edit_description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything worth remembering about it (optional)"
              className={`${FIELD_TEXTAREA} w-full resize-y px-3 py-2 text-sm`}
            />
          </div>

          <InputDatePicker
            id="edit_due_date"
            name="edit_due_date"
            label="Due Date & Reminder"
            showTime
            selectedDate={dueMoment}
            setSelectedDate={setDueMoment}
            setCurrentDate={setDueMoment}
            className="h-9 w-full"
          />

          <div className="flex flex-col text-left">
            <label className={`${FIELD_LABEL} text-sm`}>Colour</label>
            <div className="flex h-9 items-center gap-1.5">
              {COLORS.map((swatch) => (
                <button
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
            className="h-9 whitespace-nowrap bg-slate-500 hover:bg-slate-600 dark:bg-gray-500 dark:hover:bg-gray-600"
            icon={<FiX className="mr-2 text-lg text-white" />}
          />
          <ButtonLoading
            onClick={submit}
            label="Save"
            variant="primary"
            buttonLoading={saving}
            disabled={!canSave}
            className="h-9 whitespace-nowrap"
            icon={<FiSave className="mr-2 text-lg text-white" />}
          />
        </div>
      </div>
    </div>
  );
};

interface SectionProps extends Omit<TodoCardProps, 'todo' | 'busy'> {
  title: string;
  items: Todo[];
  busyId: number | null;
  /** Overdue counts in red; everything else in the brand blue. */
  tone?: 'default' | 'danger';
}

/**
 * Notes are short, so a single column down the middle of a wide screen wasted
 * most of it. Two across from `sm`, three from `xl`.
 */
const Section = ({ title, items, busyId, tone = 'default', ...handlers }: SectionProps) =>
  items.length === 0 ? null : (
    <div className="mb-9">
      {/* A rule running out from the heading ties the row of notes under it
          together and separates it from the row above without a box. */}
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-body dark:text-bodydark">
          {title}
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            tone === 'danger' ? 'bg-danger/15 text-danger' : 'bg-primary/10 text-primary'
          }`}
        >
          {items.length}
        </span>
        <span className="h-px flex-1 bg-stroke dark:bg-strokedark" />
      </div>

      {/* Two across, so a note is half the width of the panel above it. Three
          columns cut each one to a third and they read as table cells. */}
      <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2">
        {items.map((todo) => (
          <TodoCard key={todo.id} todo={todo} busy={busyId === todo.id} {...handlers} />
        ))}
      </div>
    </div>
  );

export default function MyTasks() {
  const [todos, setTodos] = useState<TodoBuckets>(EMPTY_BUCKETS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  /** The one note a request is in flight for -- only its buttons go quiet. */
  const [busyId, setBusyId] = useState<number | null>(null);
  /** The note the delete dialog is asking about, or null when it is closed. */
  const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);
  const [deleting, setDeleting] = useState(false);
  /** The note open in the edit dialog, or null when it is closed. */
  const [todoToEdit, setTodoToEdit] = useState<Todo | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  // Opens on today at midnight -- the day filled in, the reminder left off.
  const [selectedDate, setSelectedDate] = useState<Date | null>(dayjs().startOf('day').toDate());

  useEffect(() => {
    fetchTodos();
  }, []);

  /**
   * `silent` keeps the notes already on screen while the new list arrives.
   * The full-screen loader belongs to the first load only -- swapping the whole
   * board for a spinner after every tick made every card blink away and back.
   */
  const fetchTodos = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await httpService.get('/user-todos');
      // The API envelope nests the payload one level deeper
      // ({ data: { data: {...}, transaction_date } }); tolerate a flat shape
      // too so either form renders.
      const payload = res.data?.data;
      const data = payload?.today || payload?.upcoming ? payload : payload?.data;

      setTodos({
        overdue: data?.overdue ?? [],
        today: data?.today ?? [],
        upcoming: data?.upcoming ?? [],
      });
    } catch (err: any) {
      if (!silent) setTodos(EMPTY_BUCKETS);
      if (!err?.toastReported) {
        toast.error('Failed to load tasks.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const addTodo = async () => {
    const dueDate = dateToString(selectedDate);
    const dueTime = timeToString(selectedDate);

    if (!newTitle.trim() || !dueDate || saving) return;

    setSaving(true);
    try {
      await httpService.post('/user-todos', {
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        due_date: dueDate,
        color: selectedColor,
        // The two halves of the one field: the day is the note's date, and the
        // hour -- if the picker was left off midnight -- is when it nudges.
        reminder_time: dueTime ? `${dueDate} ${dueTime}:00` : null,
      });
      setNewTitle('');
      setNewDescription('');
      setSelectedColor(COLORS[0]);
      setSelectedDate(dayjs().startOf('day').toDate());
      await fetchTodos({ silent: true });
    } catch (err: any) {
      if (!err?.toastReported) {
        toast.error(err?.response?.data?.message || 'Failed to add task.');
      }
    } finally {
      setSaving(false);
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

  const toggleComplete = useCallback(
    (todo: Todo) => patchTodo(todo, { is_completed: !todo.is_completed }),
    [patchTodo],
  );

  const openEditor = useCallback((todo: Todo) => setTodoToEdit(todo), []);

  /**
   * The dialog closes only once the row is saved. A failure leaves it open with
   * the typing still in it, which is the one thing a form owes somebody who has
   * just written something.
   */
  const saveEdit = useCallback(
    async (todo: Todo, changes: Record<string, any>) => {
      setSavingEdit(true);
      const saved = await patchTodo(todo, changes);
      setSavingEdit(false);

      if (saved) setTodoToEdit(null);
    },
    [patchTodo],
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

  const isEmpty =
    todos.overdue.length === 0 && todos.today.length === 0 && todos.upcoming.length === 0;

  // One stable object, so a card's props only change when the card does.
  const cardHandlers = useMemo(
    () => ({
      onToggleComplete: toggleComplete,
      onTogglePin: togglePin,
      onEdit: openEditor,
      onDelete: askDelete,
    }),
    [toggleComplete, togglePin, openEditor, askDelete],
  );

  return (
    <div>
      <HelmetTitle title="My Tasks" />
      <style>{NOTE_3D_CSS}</style>

      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* Add New Todo. The card, the fields and the button are the app's own
            -- InputElement and ButtonLoading carry the shared border, height and
            square corners, so this screen states none of them itself. */}
        <div className="mb-8 rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
          <h2 className="mb-4 text-lg font-semibold text-black dark:text-white">Add New Task</h2>

          {/* Two rows on a monitor, stacking to a column once there is no room:
              what the task is on top, the detail of it underneath, and the
              button last so the eye finishes where the click goes.

              Day and hour are one field, not two: the app's own picker opens
              the calendar with the clock beside it, and a note is one moment
              rather than a date and a separate time to keep in step. */}
          <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-12">
            <div className="md:col-span-7">
              <InputElement
                id="title"
                name="title"
                label="Task"
                placeholder="What do you want to do?"
                value={newTitle}
                className="mb-0 h-9"
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTodo()}
              />
            </div>

            <div className="md:col-span-5">
              <InputDatePicker
                id="due_date"
                name="due_date"
                label="Due Date & Reminder"
                showTime
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                setCurrentDate={setSelectedDate}
                className="h-9 w-full"
              />
            </div>

            <div className="flex flex-col text-left md:col-span-8">
              <label className={`${FIELD_LABEL} text-sm`} htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={2}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Anything worth remembering about it (optional)"
                className={`${FIELD_TEXTAREA} w-full resize-y px-3 py-2 text-sm`}
              />
            </div>

            <div className="flex flex-col text-left md:col-span-2">
              <label className={`${FIELD_LABEL} text-sm`}>Colour</label>
              <div className="flex h-9 items-center gap-1.5">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    title="Use this colour"
                    className={`h-6 w-6 rounded-sm border transition-colors ${
                      selectedColor === color
                        ? 'border-primary ring-1 ring-primary'
                        : 'border-stroke dark:border-strokedark'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <ButtonLoading
                onClick={addTodo}
                buttonLoading={saving}
                disabled={!newTitle.trim() || !selectedDate || saving}
                label="Add Task"
                className="h-9 w-full whitespace-nowrap text-center"
                icon={<FiPlus className="mr-2 text-lg text-white" />}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <Loader />
        ) : (
          <>
            {/* Anything left unfinished from an earlier day comes first. */}
            <Section
              title="Overdue"
              items={todos.overdue}
              busyId={busyId}
              tone="danger"
              {...cardHandlers}
            />
            <Section title="Today" items={todos.today} busyId={busyId} {...cardHandlers} />
            <Section title="Upcoming" items={todos.upcoming} busyId={busyId} {...cardHandlers} />

            {isEmpty && (
              <div className="rounded-sm border border-dashed border-stroke py-14 text-center dark:border-strokedark">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No tasks yet. Add one above to get started.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Keyed by id so each note opens the dialog with its own values. */}
      {todoToEdit ? (
        <EditTodoModal
          key={todoToEdit.id}
          todo={todoToEdit}
          saving={savingEdit}
          onCancel={() => setTodoToEdit(null)}
          onSave={saveEdit}
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
