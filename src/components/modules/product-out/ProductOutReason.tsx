import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiEdit2, FiPlus, FiRefreshCcw, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import HelmetTitle from '../../utils/others/HelmetTitle';
import { Button, ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import InputElement from '../../utils/fields/InputElement';
import Checkbox from '../../utils/fields/Checkbox';
import Table from '../../utils/others/Table';
import thousandSeparator from '../../utils/utils-functions/thousandSeparator';
import { destroyReason, getProductOutReasons, saveReason } from './productOutSlice';

const emptyForm = { id: null as number | null, name: '', needs_party: false, sort: '' };

/**
 * Why the goods went — the shop's own short list.
 *
 * `needs_party` is the reason's own answer to "does this owe a name?". A piece
 * swapped back to a customer does; a breakage does not. The entry form reads it
 * off this row, so adding a reason here is all it takes to make the customer box
 * appear on that reason and no other.
 */
const ProductOutReason = () => {
  const dispatch = useDispatch<any>();
  const productOut = useSelector((s: any) => s.productOut);
  const reasons: any[] = Array.isArray(productOut?.reasons) ? productOut.reasons : [];

  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(getProductOutReasons());
  }, [dispatch]);

  const clearForm = () => setForm({ ...emptyForm });

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Give the reason a name');
      return;
    }

    setSaving(true);
    dispatch(
      saveReason(
        form.id,
        {
          name: form.name.trim(),
          needs_party: form.needs_party,
          sort: form.sort === '' ? 99 : Number(form.sort),
          is_active: true,
        },
        (response: any) => {
          if (response?.success) {
            toast.success(response?.message || 'Saved');
            clearForm();
            dispatch(getProductOutReasons());
          } else {
            toast.error(response?.message || 'Save failed');
          }
          setSaving(false);
        },
      ),
    );
  };

  const handleDelete = (row: any) => {
    // ⚠️ A reason already used on a slip is retired, not deleted -- the server
    // decides that, and says which happened, because the old slips still have to
    // explain themselves.
    if (!window.confirm(`Remove "${row.name}"?`)) return;

    dispatch(
      destroyReason(row.id, (response: any) => {
        if (response?.success) {
          toast.success(response?.message || 'Removed');
          dispatch(getProductOutReasons());
        } else {
          toast.error(response?.message || 'Remove failed');
        }
      }),
    );
  };

  const columns = [
    {
      key: 'sl',
      header: 'Sl',
      headerClass: 'text-center w-16',
      cellClass: 'text-center w-16',
      render: (_row: any, index: number) => <span>{index + 1}</span>,
    },
    {
      key: 'name',
      header: 'Reason',
      render: (row: any) => <span>{row?.name || '-'}</span>,
    },
    {
      key: 'needs_party',
      header: 'Asks for a name',
      headerClass: 'text-center w-40',
      cellClass: 'text-center w-40',
      render: (row: any) => <span>{Number(row?.needs_party) === 1 ? 'Yes' : 'No'}</span>,
    },
    {
      key: 'sort',
      header: 'Order',
      headerClass: 'text-right w-24',
      cellClass: 'text-right w-24',
      render: (row: any) => <span>{thousandSeparator(Number(row?.sort || 0))}</span>,
    },
    {
      key: 'is_active',
      header: 'Offered',
      headerClass: 'text-center w-28',
      cellClass: 'text-center w-28',
      // A retired reason still explains the slips that used it, so it stays in
      // the list and stops being offered on the form.
      render: (row: any) => <span>{Number(row?.is_active) === 1 ? 'Yes' : 'Retired'}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center w-28',
      cellClass: 'text-center w-28',
      render: (row: any) => (
        <div className="flex items-center justify-center gap-2">
          <Button
            type="button"
            onClick={() =>
              setForm({
                id: Number(row.id),
                name: row.name || '',
                needs_party: Number(row.needs_party) === 1,
                sort: String(row.sort ?? ''),
              })
            }
            title="Edit"
            className="text-green-600 hover:text-green-800"
          >
            <FiEdit2 className="cursor-pointer text-lg" />
          </Button>
          <Button
            type="button"
            onClick={() => handleDelete(row)}
            title="Remove"
            className="text-red-500 hover:text-red-700"
          >
            <FiTrash2 className="cursor-pointer text-lg" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <HelmetTitle title="Product Out Reasons" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end mb-4">
        <InputElement
          id="name"
          name="name"
          label="Reason"
          placeholder="e.g. ভেঙে গেছে"
          value={form.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm((prev) => ({ ...prev, name: e.target.value }))
          }
          className="w-full "
        />
        <InputElement
          id="sort"
          name="sort"
          type="number"
          label="Order"
          placeholder="99"
          value={form.sort}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setForm((prev) => ({ ...prev, sort: e.target.value }))
          }
          className="w-full "
        />
        <Checkbox
          id="needs_party"
          name="needs_party"
          label="This one asks who it went back to"
          checked={form.needs_party}
          onChange={() => setForm((prev) => ({ ...prev, needs_party: !prev.needs_party }))}
          labelClassName="cursor-pointer text-sm"
          className="pb-2"
        />
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
        <ButtonLoading
          onClick={handleSave}
          buttonLoading={saving}
          label={form.id ? 'Update' : 'Add'}
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={form.id ? <FiEdit2 className="text-lg ml-2 mr-2" /> : <FiPlus className="text-lg ml-2 mr-2" />}
        />
        <ButtonLoading
          onClick={clearForm}
          buttonLoading={false}
          label="Clear"
          className="whitespace-nowrap text-center mr-0 py-2"
          icon={<FiRefreshCcw className="text-lg ml-2 mr-2" />}
        />
      </div>

      <Table columns={columns} data={reasons} className="" noDataMessage="No reason yet" />
    </div>
  );
};

export default ProductOutReason;
