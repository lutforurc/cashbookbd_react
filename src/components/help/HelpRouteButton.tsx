import { useLocation } from 'react-router-dom';
import HelpButton from './HelpButton';
import { helpTopicForPath } from './helpTopicForPath';

/**
 * The `?` for a routed screen that did not place one itself.
 *
 * Mounted once, inside HelpProvider, in the layout. A route with no writing
 * yet shows nothing at all -- an empty help dialog on every unfinished screen
 * would train people to stop pressing it.
 */
const HelpRouteButton = () => {
  const { pathname } = useLocation();
  const topic = helpTopicForPath(pathname);

  if (!topic) return null;

  return (
    <div className="fixed right-4 bottom-4 z-40 print:hidden">
      <HelpButton topic={topic} className="shadow-lg" />
    </div>
  );
};

export default HelpRouteButton;
