import { useEffect, useState } from 'react';

import {
  HighlightRule,
  fetchActiveHighlightRules,
} from './highlightRules';

/**
 * Active highlight rules for a report/list screen to apply. Shares one cached
 * request across every page (see fetchActiveHighlightRules), so dropping this
 * into many screens costs a single network call.
 *
 * Usage on any page:
 *   const rules = useHighlightRules();
 *   const rule = matchHighlightRule(row.notes, rules);
 *   <div className={`... ${highlightLineClass(rule)}`}>{row.notes}</div>
 */
export const useHighlightRules = (): HighlightRule[] => {
  const [rules, setRules] = useState<HighlightRule[]>([]);

  useEffect(() => {
    let alive = true;
    fetchActiveHighlightRules().then((data) => {
      if (alive) setRules(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  return rules;
};

export default useHighlightRules;
