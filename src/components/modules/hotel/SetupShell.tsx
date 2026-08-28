import React from 'react';
import { FiPlus, FiRefreshCcw, FiSave, FiX } from 'react-icons/fi';

import Table from '../../utils/others/Table';
import Pagination from '../../utils/utils-functions/Pagination';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';

/**
 * The frame the four setup tabs share: a toolbar, a form that folds away, a
 * table, and a pager.
 *
 * Written once because the four tabs are the same shape, and four copies of it
 * would have drifted the way the app's field styles once did -- one tab's Save
 * button a different size from the next, one tab's empty state a blank grid and
 * another's a sentence.
 *
 * The form sits ABOVE the table rather than on a page of its own. Setup is
 * repetitive -- twelve rooms, one after another -- and a full page turn between
 * each one turns a ten-minute job into a thirty-minute one. Saving leaves the
 * form open and the table refreshed underneath it.
 */

interface SetupShellProps {
  /** What one row is called, singular: "Building". Used in the buttons. */
  noun: string;
  /** A sentence under the heading, where the rule is not obvious from the form. */
  note?: React.ReactNode;

  /** Filters and searches, drawn by the tab itself. */
  toolbar?: React.ReactNode;

  formOpen: boolean;
  editing: boolean;
  onNew: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  /**
   * What the Save button says, where "Save" understates it.
   *
   * A button that creates twelve rooms in one press should say so before it is
   * pressed, not in the message afterwards.
   */
  saveLabel?: string;
  /** The fields. Laid out by the tab, because no two of them are alike. */
  form: React.ReactNode;

  columns: any[];
  rows: any[];
  loading: boolean;
  emptyMessage: string;

  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const SetupShell: React.FC<SetupShellProps> = ({
  noun,
  note,
  toolbar,
  formOpen,
  editing,
  onNew,
  onCancel,
  onSave,
  saving,
  saveLabel,
  form,
  columns,
  rows,
  loading,
  emptyMessage,
  page,
  totalPages,
  onPageChange,
}) => (
  <div>
    <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
      <div className="flex flex-wrap items-end gap-2">{toolbar}</div>

      {formOpen ? (
        <ButtonLoading
          onClick={onCancel}
          label="Close form"
          variant="default"
          icon={<FiX size={16} />}
        />
      ) : (
        <ButtonLoading
          onClick={onNew}
          label={`New ${noun}`}
          variant="primary"
          icon={<FiPlus size={16} />}
        />
      )}
    </div>

    {note ? (
      <p className="mb-2 text-xs leading-snug text-gray-500 dark:text-gray-400">{note}</p>
    ) : null}

    {formOpen ? (
      <div className="mb-4 rounded border border-stroke p-3 dark:border-strokedark">
        <div className="mb-2 text-sm font-medium text-black dark:text-white">
          {editing ? `Edit ${noun}` : `New ${noun}`}
        </div>

        {form}

        <div className="mt-3 flex gap-2">
          <ButtonLoading
            onClick={onSave}
            buttonLoading={saving}
            label={saveLabel ?? (editing ? 'Update' : 'Save')}
            variant="primary"
            icon={<FiSave size={16} />}
          />
          <ButtonLoading
            onClick={onCancel}
            label={editing ? 'Cancel' : 'Reset'}
            icon={<FiRefreshCcw size={16} />}
          />
        </div>
      </div>
    ) : null}

    <div className="relative">
      {loading ? <Loader /> : null}
      <Table columns={columns} data={rows} noDataMessage={emptyMessage} />
    </div>

    {totalPages > 1 ? (
      <Pagination currentPage={page} totalPages={totalPages} handlePageChange={onPageChange} />
    ) : null}
  </div>
);

export default SetupShell;
