import { FiAlertTriangle, FiPlayCircle } from 'react-icons/fi';
import type { HelpTable, HelpTopic } from './helpLoader';

/**
 * One Help topic, drawn the same in the modal and on the page.
 *
 * ⚠️ EMPTY FIELDS ARE NOT DRAWN. Every part of a section except its heading is
 * optional in help.json, and a writer leaves one out by leaving it out -- not by
 * writing an empty box. So each piece is rendered only when it has something in
 * it, and nothing here guesses at a placeholder.
 */

type Props = {
  topic: HelpTopic;
  /** Print paper: the caller's stylesheet forces every colour to black. */
  print?: boolean;
};

const youtubeId = (url: string): string | null => {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/,
  );

  return match ? match[1] : null;
};

const Video = ({ url }: { url: string }) => {
  const id = youtubeId(url);

  if (id) {
    return (
      <div className="mb-4 overflow-hidden rounded border border-[rgb(var(--c-border))]">
        <div className="aspect-video w-full">
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            title="সহায়তার ভিডিও"
            className="h-full w-full"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[rgb(var(--c-primary))] underline"
    >
      <FiPlayCircle />
      ভিডিও দেখুন
    </a>
  );
};

const Table = ({ table }: { table: HelpTable }) => {
  const headers = Array.isArray(table.headers) ? table.headers : [];
  const rows = Array.isArray(table.rows) ? table.rows : [];

  if (headers.length === 0 && rows.length === 0) return null;

  return (
    <div className="mb-3 overflow-x-auto rounded border border-[rgb(var(--c-border))]">
      <table className="w-full min-w-max text-left text-sm">
        {headers.length > 0 ? (
          <thead className="bg-[rgb(var(--c-table-head))] text-xs text-[rgb(var(--c-text))]">
            <tr>
              {headers.map((header, index) => (
                <th key={index} className="border-b border-[rgb(var(--c-border))] px-3 py-2 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-[rgb(var(--c-border))] bg-[rgb(var(--c-table-body))]">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-2 align-top text-[rgb(var(--c-text))]">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const HelpTopicView = ({ topic, print = false }: Props) => {
  const sections = Array.isArray(topic.sections) ? topic.sections : [];
  const video = typeof topic.video === 'string' ? topic.video.trim() : '';

  return (
    <div className={print ? 'help-topic-print' : ''}>
      {print ? <h1 className="mb-3 text-xl font-semibold">{topic.title}</h1> : null}

      {topic.intro ? (
        <p className="mb-4 whitespace-pre-line text-sm leading-6 text-[rgb(var(--c-text))]">
          {topic.intro}
        </p>
      ) : null}

      {video ? <Video url={video} /> : null}

      {sections.map((section, index) => (
        <section key={index} className="mb-5 last:mb-0">
          <h3 className="mb-2 text-base font-semibold text-[rgb(var(--c-text))]">
            {section.heading}
          </h3>

          {section.menu ? (
            <p className="mb-2 text-sm text-[rgb(var(--c-text))]">
              <span className="font-semibold">মেনু:</span>{' '}
              <span className="rounded bg-[rgb(var(--c-page))] px-1.5 py-0.5 text-[rgb(var(--c-text))]">
                {section.menu}
              </span>
            </p>
          ) : null}

          {Array.isArray(section.steps) && section.steps.length > 0 ? (
            <ul className="mb-3 list-disc space-y-1 pl-5 text-sm leading-6 text-[rgb(var(--c-text))]">
              {section.steps.map((step, stepIndex) => (
                <li key={stepIndex}>{step}</li>
              ))}
            </ul>
          ) : null}

          {section.table ? <Table table={section.table} /> : null}

          {section.warning ? (
            <div className="mt-3 flex gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-500/10 dark:text-amber-200">
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              <p className="leading-6">{section.warning}</p>
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
};

export default HelpTopicView;
