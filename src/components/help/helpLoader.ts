/**
 * The Help files, loaded once and kept until the page is reloaded.
 *
 * ⚠️ HELP TEXT LIVES ONLY IN public/help/. Nothing in this file or in any
 * component repeats a sentence of it. Adding a topic, or correcting one, is a
 * JSON edit -- never a code change.
 *
 * ⚠️ NOTHING ELSE IN THE APP MAY DEPEND ON THIS. A missing or broken help file
 * is a Help problem and nothing more: the loader rejects, and the modal and the
 * page show the same short message inside their own box. No screen is allowed
 * to throw because a help file is not there.
 */

export type HelpTable = {
  headers?: string[];
  rows?: string[][];
};

export type HelpSection = {
  heading: string;
  menu?: string;
  steps?: string[];
  table?: HelpTable;
  warning?: string;
};

export type HelpTopic = {
  title: string;
  module?: string;
  /** When the writing last changed; shown in small text in the modal. */
  updated?: string;
  businessTypes?: string[];
  video?: string;
  intro?: string;
  sections?: HelpSection[];
};

/** One module file's contents: topic id => topic. */
export type HelpDocument = Record<string, HelpTopic>;

export type HelpIndexEntry = {
  id: string;
  title: string;
  file: string;
  topics?: string[];
};

export type HelpIndex = {
  modules: HelpIndexEntry[];
};

/** The only thing either surface says when a file cannot be read. */
export const HELP_UNAVAILABLE_MESSAGE =
  'সহায়তা এখন খোলা যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।';

/** Shown in the modal when the screen has no topic yet. */
export const HELP_TOPIC_MISSING_MESSAGE = 'এই স্ক্রিনের সহায়তা এখনো যোগ হয়নি';

// `import.meta.env` is not typed in this project's tsconfig (the existing
// apiRoutes file carries the same gap). Read it through a narrow cast so this
// module adds no new type error.
const env = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env;

const helpBase = () => (env?.BASE_URL || '/').replace(/\/+$/, '');

const helpUrl = (file: string) => `${helpBase()}/help/${file}`;

const indexCache: { value: HelpIndex | null } = { value: null };
const moduleCache = new Map<string, HelpDocument>();

let indexPending: Promise<HelpIndex> | null = null;
const modulePending = new Map<string, Promise<HelpDocument>>();

const isTopic = (value: unknown): value is HelpTopic => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const topic = value as HelpTopic;

  return typeof topic.title === 'string' && topic.title.trim() !== '' && Array.isArray(topic.sections);
};

const isHelpDocument = (value: unknown): value is HelpDocument => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const entries = Object.values(value as Record<string, unknown>);

  return entries.length > 0 && entries.every(isTopic);
};

const isHelpIndex = (value: unknown): value is HelpIndex => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const modules = (value as HelpIndex).modules;

  return (
    Array.isArray(modules) &&
    modules.length > 0 &&
    modules.every(
      (one) =>
        one &&
        typeof one.id === 'string' &&
        typeof one.title === 'string' &&
        typeof one.file === 'string',
    )
  );
};

const fetchJson = async (url: string): Promise<unknown> => {
  const response = await fetch(url, { cache: 'no-cache' });

  if (!response.ok) throw new Error(`${url}: ${response.status}`);

  return response.json();
};

/** The module list. Cached for the life of the page. */
export const loadHelpIndex = (): Promise<HelpIndex> => {
  if (indexCache.value) return Promise.resolve(indexCache.value);
  if (indexPending) return indexPending;

  indexPending = fetchJson(helpUrl('index.json'))
    .then((json) => {
      if (!isHelpIndex(json)) throw new Error('help/index.json: unexpected shape');

      indexCache.value = json;

      return json;
    })
    .finally(() => {
      indexPending = null;
    });

  return indexPending;
};

/**
 * One module's topics. Cached per file; a failed attempt is not cached, so
 * trying again later can succeed.
 */
export const loadHelpModule = (file: string): Promise<HelpDocument> => {
  const cached = moduleCache.get(file);

  if (cached) return Promise.resolve(cached);

  const pending = modulePending.get(file);

  if (pending) return pending;

  const request = fetchJson(helpUrl(file))
    .then((json) => {
      if (!isHelpDocument(json)) throw new Error(`help/${file}: unexpected shape`);

      moduleCache.set(file, json);

      return json;
    })
    .finally(() => {
      modulePending.delete(file);
    });

  modulePending.set(file, request);

  return request;
};

/**
 * The topic behind one id. Returns null when the topic simply does not exist
 * (the modal's "not written yet" case); throws only when a file cannot be read.
 */
export const loadTopic = async (topicId: string): Promise<HelpTopic | null> => {
  const index = await loadHelpIndex();
  const entry = index.modules.find((one) => (one.topics ?? []).includes(topicId));

  if (!entry) return null;

  const document = await loadHelpModule(entry.file);

  return document[topicId] ?? null;
};

/** Every topic in every module, for the Help page's list and search. */
export const loadAllTopics = async (): Promise<HelpDocument> => {
  const index = await loadHelpIndex();
  const documents = await Promise.all(index.modules.map((one) => loadHelpModule(one.file)));

  return documents.reduce<HelpDocument>((all, document) => ({ ...all, ...document }), {});
};
