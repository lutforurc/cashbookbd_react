import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiCheckSquare, FiRefreshCcw, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import HelmetTitle from "../../../utils/others/HelmetTitle";
import SearchInput from "../../../utils/fields/SearchInput";
import InputElement from "../../../utils/fields/InputElement";
import Table from "../../../utils/others/Table";
import ConfirmModal from "../../../utils/components/ConfirmModalProps";
import Loader from "../../../../common/Loader";
import { ButtonLoading, ROW_ACTION_BUTTON_CLASS } from "../../../../pages/UiElements/CustomButtons";
import { hasPermission } from "../../../utils/permissionChecker";
import routes from "../../../services/appRoutes";
import {
  deleteAccountOpening,
  getAccountOpenings,
  updateAccountOpening,
  type OpeningAccount,
} from "./accountOpeningSlice";
import { Button } from '../../../../pages/UiElements/CustomButtons';

/**
 * Opening balances for the money accounts -- cash, the banks, mobile banking.
 *
 * The Chart of Accounts Level 4 screen deliberately has no opening column: most
 * of what it lists are expense and sales heads, which open at nothing. This is
 * the screen behind that decision, and the API decides which Level 3 groups it
 * offers, so adding mobile banking wallets to the list needs no change here.
 *
 * There is no opening balance column on acc_coa_level4s. Each figure is read
 * back off its own journal voucher, so what the screen shows is what the ledger
 * holds rather than a copy that can drift away from it.
 */
const AccountOpeningBalance = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const settings = useSelector((state: any) => state.settings);
  const { accounts, loading, error } = useSelector((state: any) => state.accountOpening);

  const [search, setSearchValue] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [editedRows, setEditedRows] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteRow, setDeleteRow] = useState<OpeningAccount | null>(null);

  const isOpeningEnabled = settings?.data?.branch?.is_opening == 1;
  const canEdit = hasPermission(settings?.data?.permissions, 'bank.opening.edit');
  // Deleting an opening balance deletes a voucher, so it answers to the voucher
  // permission -- the same one the API checks. Gating it on coa.l4.edit alone
  // would offer a button that comes back 403.
  const canDeleteVoucher = hasPermission(settings?.data?.permissions, 'voucher.delete');

  useEffect(() => {
    if (!isOpeningEnabled) return;
    dispatch(getAccountOpenings({ search: submittedSearch }) as any);
  }, [dispatch, submittedSearch, isOpeningEnabled]);

  const refresh = () => dispatch(getAccountOpenings({ search: submittedSearch }) as any);

  /**
   * The spinner replaces the list only when there is no list to replace. A
   * reload after Save leaves the rows where they are and dims them instead:
   * swapping thirty rows for a spinner and back moves everything under the
   * pointer, which reads as the page jumping.
   */
  const hasRows = Array.isArray(accounts) && accounts.length > 0;
  const isFirstLoad = loading && !hasRows;
  const isReloading = loading && hasRows;

  /**
   * One section per Level 3 group, in the order the API sent them. A page
   * boundary through the middle of "Bank Account" would say nothing useful, so
   * the groups are kept whole and the list is not paginated.
   */
  const groups = useMemo(() => {
    const bucket = new Map<number, { id: number; name: string; rows: OpeningAccount[] }>();

    (Array.isArray(accounts) ? accounts : []).forEach((row: OpeningAccount) => {
      if (!bucket.has(row.group_id)) {
        bucket.set(row.group_id, { id: row.group_id, name: row.group_name, rows: [] });
      }
      bucket.get(row.group_id)!.rows.push(row);
    });

    return Array.from(bucket.values());
  }, [accounts]);

  const totalOpening = useMemo(
    () => (Array.isArray(accounts) ? accounts : [])
      .reduce((sum: number, row: OpeningAccount) => sum + Number(row.openingbalance || 0), 0),
    [accounts]
  );

  const money = (value: number) =>
    Number(value || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const draftOf = (row: OpeningAccount) =>
    editedRows[row.id] ?? String(row.openingbalance ?? "");

  const isRowDirty = (row: OpeningAccount) => {
    const draft = editedRows[row.id];
    if (draft === undefined) return false;

    // Compared as numbers so "1200" against 1200.00 does not read as an edit and
    // offer a Save that the API would answer with "No changes were made."
    const typed = draft.trim();
    if (typed === "") return Number(row.openingbalance || 0) !== 0;

    return Number(typed) !== Number(row.openingbalance || 0);
  };

  const clearDraft = (id: number) =>
    setEditedRows((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

  const handleSaveRow = (row: OpeningAccount) => {
    if (!isRowDirty(row)) return;

    // An emptied box means zero, which is how an opening balance is taken back
    // off an account without reaching for Delete.
    const typed = (editedRows[row.id] ?? "").trim();
    const amount = typed === "" ? 0 : Number(typed);

    if (Number.isNaN(amount)) {
      toast.error("Opening balance must be a number.");
      return;
    }

    setSavingId(row.id);
    dispatch(updateAccountOpening({ id: row.id, openingbalance: amount }) as any)
      .unwrap()
      .then((res: any) => {
        clearDraft(row.id);
        toast.success(res?.message || "Opening balance updated");

        // Returned, not fired and forgotten, so the row keeps its spinner until
        // the figure on screen is the one the server just wrote.
        return refresh();
      })
      .catch((err: any) => {
        toast.error(err || "Opening balance could not be saved");
      })
      .finally(() => setSavingId(null));
  };

  const handleDeleteConfirmed = () => {
    if (!deleteRow) return;

    setDeletingId(deleteRow.id);
    dispatch(deleteAccountOpening(deleteRow.id) as any)
      .unwrap()
      .then((res: any) => {
        toast.success(res?.message || "Opening balance deleted");
        // The typed-but-unsaved figure would otherwise sit in the box looking
        // like the balance survived.
        clearDraft(deleteRow.id);
        setDeleteRow(null);

        return refresh();
      })
      .catch((err: any) => {
        toast.error(err || "Opening balance could not be deleted");
        setDeleteRow(null);
      })
      .finally(() => setDeletingId(null));
  };

  /**
   * The voucher number is the thread back to the ledger. Rather than only
   * printing it, clicking it opens the ledger already pointed at this account,
   * which is where an opening balance gets checked against everything that came
   * after it.
   */
  const handleOpenLedger = (row: OpeningAccount) => {
    navigate(routes.report_ledger, {
      state: { ledgerAccount: { ledgerId: row.id, label: row.name } },
    });
  };

  const columns = [
    {
      key: 'serial',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center w-16',
      render: (_row: OpeningAccount, index: number) => index + 1,
    },
    {
      key: 'name',
      header: 'Account',
      render: (row: OpeningAccount) => (
        <div className="flex items-center gap-2">
          <span>{row.name}</span>

          {/* An account closed after it opened still carries a figure in the
              ledger. It is shown so the figure can be cleared, but marked so
              nobody reads it as one they can still post against. */}
          {!row.is_active && (
            <span
              title="This account is inactive. Its opening balance can be removed but not changed."
              className="rounded-sm bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
            >
              Inactive
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'openingbalance',
      header: 'Opening',
      headerClass: 'text-right',
      cellClass: 'text-right',
      render: (row: OpeningAccount) => (
        <div className="flex flex-col items-end gap-0.5">
          <InputElement
            type="number"
            step="0.01"
            placeholder="Opening"
            disabled={!canEdit || !row.is_active}
            value={draftOf(row)}
            className="text-right w-32"
            onChange={(e) =>
              setEditedRows((prev) => ({ ...prev, [row.id]: e.target.value }))
            }
          />

          {/* The voucher this figure sits on. Without it the balance is a
              number nobody can trace; with it the ledger is one click away. */}
          {row.opening_vr_no && (
            <Button
              type="button"
              title={`Journal voucher ${row.opening_vr_no} — open ledger`}
              onClick={() => handleOpenLedger(row)}
              className="font-mono text-[10px] leading-tight text-blue-600 hover:underline dark:text-blue-400"
            >
              {row.opening_vr_no}
            </Button>
          )}
        </div>
      ),
    },
    {
      // Hard against the right edge of the table, where every other list on
      // this system keeps its actions.
      key: 'action',
      header: '',
      headerClass: 'text-right',
      // The table lays out fixed, so a column left without a width takes an
      // equal share of what is going -- which left the buttons stranded in the
      // middle of a quarter-page column. Held to what the three buttons need,
      // the account names get the rest.
      cellClass: 'text-right w-72',
      render: (row: OpeningAccount) => (
        <div className="flex justify-end">
          {/* Three slots of equal width, always three. Delete comes and goes as
              vouchers are saved and removed; were its slot to go with it, every
              other button in the row would slide sideways and the column would
              resize under the clerk's hand. */}
          <div className="grid grid-cols-3 items-center gap-1.5">
            <ButtonLoading
              className={ROW_ACTION_BUTTON_CLASS}
              size="sm"
              label="Save"
              type="button"
              icon={<FiCheckSquare size={14} />}
              buttonLoading={savingId === row.id}
              disabled={!canEdit || !row.is_active || !isRowDirty(row) || savingId === row.id}
              onClick={() => handleSaveRow(row)}
            />
            <ButtonLoading
              icon={<FiX size={14} />}
              className={ROW_ACTION_BUTTON_CLASS}
              size="sm"
              label="Cancel"
              type="button"
              disabled={editedRows[row.id] === undefined}
              onClick={() => clearDraft(row.id)}
            />

            {/* Only where there is a voucher to delete. An account that never
                opened with anything has nothing to offer here, and saying so by
                leaving the button out reads faster than grey-ing it. */}
            <div>
              {row.opening_vr_no && canDeleteVoucher ? (
                <ButtonLoading
                  icon={<FiTrash2 size={14} />}
                  className={`${ROW_ACTION_BUTTON_CLASS} bg-red-600 hover:bg-red-700`}
                  size="sm"
                  label="Delete"
                  type="button"
                  buttonLoading={deletingId === row.id}
                  disabled={deletingId === row.id}
                  onClick={() => setDeleteRow(row)}
                />
              ) : null}
            </div>
          </div>
        </div>
      ),
    },
  ];

  if (!isOpeningEnabled) {
    return (
      <>
        <HelmetTitle title="Account Opening Balance" />
        <div className="rounded-sm border border-stroke bg-white p-6 text-center text-slate-600 shadow-default dark:border-strokedark dark:bg-boxdark dark:text-slate-300">
          Opening balances are switched off for this branch. Turn them on in the
          branch settings to record what cash and the bank accounts started with.
        </div>
      </>
    );
  }

  return (
    <>
      <HelmetTitle title="Account Opening Balance" />

      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stroke px-4 py-4 dark:border-strokedark">
          <div>
            <h2 className="text-lg font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
              Account Opening Balance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              What cash, the bank accounts and the mobile banking wallets held on
              the day this book starts. Each figure is posted as a journal voucher.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <SearchInput
              search={search}
              setSearchValue={setSearchValue}
              className="py-1.5"
            />
            <ButtonLoading
              label="Search"
              type="button"
              className="py-1.5 px-3"
              icon={<FiSearch size={15} />}
              onClick={() => setSubmittedSearch(search)}
            />
            <ButtonLoading
              label="Refresh"
              type="button"
              className="py-1.5 px-3"
              icon={<FiRefreshCcw size={15} />}
              onClick={refresh}
            />
          </div>
        </div>

        {isFirstLoad ? (
          <Loader />
        ) : error ? (
          <div className="px-4 py-8 text-center text-red-600 dark:text-red-400">{error}</div>
        ) : groups.length === 0 ? (
          <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
            No accounts to open. Cash, bank and mobile banking accounts appear here
            once they are active in the Chart of Accounts.
          </div>
        ) : (
          <div
            className={`p-4 transition-opacity duration-200 ${
              isReloading ? 'pointer-events-none opacity-60' : 'opacity-100'
            }`}
          >
            {groups.map((group) => (
              <div key={group.id} className="mb-6 last:mb-0">
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                    {group.name}
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {money(group.rows.reduce((sum, row) => sum + Number(row.openingbalance || 0), 0))}
                  </span>
                </div>

                <Table columns={columns} data={group.rows} />
              </div>
            ))}

            <div className="flex justify-end border-t border-stroke pt-3 text-sm font-semibold text-slate-800 dark:border-strokedark dark:text-slate-100">
              Total opening&nbsp;<span className="font-mono">{money(totalOpening)}</span>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        show={Boolean(deleteRow)}
        title="Delete Opening Balance"
        message={
          <div className="text-base leading-7 text-slate-700 dark:text-slate-200">
            <div>Delete the opening balance of</div>
            <div className="font-bold text-slate-900 dark:text-[rgb(var(--c-text))]">{deleteRow?.name}</div>
            <div className="mt-2 text-sm">
              Amount{' '}
              <span className="font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
                {money(Number(deleteRow?.openingbalance || 0))}
              </span>
              {' · '}Voucher{' '}
              <span className="font-mono font-semibold text-slate-900 dark:text-[rgb(var(--c-text))]">
                {deleteRow?.opening_vr_no}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              The voucher goes to the trash, not away for good. The account is not deleted.
            </div>
          </div>
        }
        cancelLabel="Cancel"
        confirmLabel="Delete"
        className="bg-red-600 hover:bg-red-700 min-w-[128px]"
        loading={deletingId === deleteRow?.id}
        onCancel={() => setDeleteRow(null)}
        onConfirm={handleDeleteConfirmed}
      />
    </>
  );
};

export default AccountOpeningBalance;
