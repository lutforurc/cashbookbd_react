import { useHelp } from './HelpProvider';

type Props = {
  /** The key in this screen's file under public/help/. */
  topic: string;
  className?: string;
};

/**
 * The `?` in the page-title row, immediately after the video link.
 *
 * Nothing but the button: HelmetTitle places it, the dialog is mounted once in
 * the layout, and this only asks it to open a topic.
 */
const HelpButton = ({ topic, className = '' }: Props) => {
  const openHelp = useHelp();

  return (
    <button
      type="button"
      onClick={() => openHelp(topic)}
      aria-label="সহায়তা"
      aria-haspopup="dialog"
      title="সহায়তা"
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] text-sm font-bold text-[rgb(var(--c-primary))] transition hover:bg-[rgb(var(--c-primary)/0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--c-primary))] ${className}`}
    >
      ?
    </button>
  );
};

export default HelpButton;
