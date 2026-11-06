import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import HelpModal from './HelpModal';

/**
 * The one dialog for the whole project.
 *
 * ⚠️ MOUNTED ONCE, IN THE LAYOUT. A screen does not own a modal, does not hold
 * its state and does not know which file the writing lives in -- it calls
 * openHelp('topic-id') (or renders <HelpButton topic="topic-id" />, which is
 * only a `?` that calls it). Adding a screen is one line, and adding content is
 * a JSON edit; neither needs any new dialog code.
 *
 * Because the dialog lives above the routed screen, opening and closing it
 * never unmounts the form behind it. The address is not touched either: the
 * only navigation is the explicit "see the whole thing" link inside the modal.
 */

type OpenHelp = (topicId: string) => void;

const HelpContext = createContext<OpenHelp>(() => {
  // A screen rendered outside the authenticated layout (a public page, a
  // test render) simply has nowhere to show help. Saying nothing is better
  // than throwing on a page that never asked for the dialog.
});

export const useHelp = (): OpenHelp => useContext(HelpContext);

const HelpProvider = ({ children }: { children: ReactNode }) => {
  const [topicId, setTopicId] = useState<string | null>(null);

  const openHelp = useCallback<OpenHelp>((id) => setTopicId(id), []);
  const closeHelp = useCallback(() => setTopicId(null), []);

  const value = useMemo(() => openHelp, [openHelp]);

  return (
    <HelpContext.Provider value={value}>
      {children}
      {topicId ? <HelpModal topicId={topicId} onClose={closeHelp} /> : null}
    </HelpContext.Provider>
  );
};

export default HelpProvider;
