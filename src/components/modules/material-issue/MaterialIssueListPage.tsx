import React from 'react';
import HelmetTitle from '../../utils/others/HelmetTitle';
import MaterialIssueList from './MaterialIssueList';

/**
 * Issue List as its own screen (web `/inventory/material-issue-list`).
 *
 * The same table the Material Issue form shows under itself, reachable from
 * the tab strip without opening a form first. It is the same component rather
 * than a second copy, so the two can never disagree about what was issued.
 */
const MaterialIssueListPage: React.FC = () => (
  <div>
    <HelmetTitle title="Issue List" />
    <MaterialIssueList />
  </div>
);

export default MaterialIssueListPage;
