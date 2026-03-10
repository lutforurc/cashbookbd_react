import React, { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiEye, FiPlus } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import ROUTES from '../../services/appRoutes';
import SearchInput from '../../utils/fields/SearchInput';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Link from '../../utils/others/Link';
import Table from '../../utils/others/Table';
import Pagination from '../../utils/utils-functions/Pagination';
import SelectOption from '../../utils/utils-functions/SelectOption';
import { chartDateTime } from '../../utils/utils-functions/formatDate';
import SmsTemplatePreviewModal from './SmsTemplatePreviewModal';
import {
  clearSmsTemplatePreview,
  fetchSmsTemplates,
  previewSmsTemplate,
} from './smsSlice';

const SmsTemplateList = () => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const smsState = useSelector((state: any) => state.sms);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchSmsTemplates({ page, per_page: perPage, search }));
  }, [dispatch, page, perPage, search]);

  useEffect(() => {
    if (smsState?.templatesError) {
      toast.error(smsState.templatesError);
    }
  }, [smsState?.templatesError]);

  const tableData = useMemo(
    () =>
      (smsState?.templates || []).map((item: any, index: number) => ({
        ...item,
        serial_no: (page - 1) * perPage + index + 1,
      })),
    [page, perPage, smsState?.templates],
  );

  const totalPages = Number(smsState?.templatePagination?.last_page || 1);

  const handleSearch = () => {
    setPage(1);
    setCurrentPage(1);
    setSearch(searchInput.trim());
  };

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setPerPage(Number(event.target.value));
    setPage(1);
    setCurrentPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    setCurrentPage(nextPage);
  };

  const handlePreview = async (row: any) => {
    setPreviewOpen(true);
    dispatch(clearSmsTemplatePreview());
    await dispatch(
      previewSmsTemplate({
        id: row.id,
        name: row.name,
        slug: row.slug,
        body: row.body,
        description: row.description,
        status: row.status,
        sample_data: row.sample_data,
      }),
    );
  };

  const columns = [
    {
      key: 'serial_no',
      header: 'Sl.',
      headerClass: 'text-center',
      cellClass: 'text-center',
    },
    {
      key: 'name',
      header: 'Template',
      render: (row: any) => (
        <div className="space-y-1">
          <div className="font-medium text-slate-800 dark:text-slate-100">{row.name || '-'}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {row.code || row.slug || '-'}
          </div>
        </div>
      ),
    },
    {
      key: 'placeholders',
      header: 'Placeholders',
      render: (row: any) => {
        const placeholders = Array.isArray(row.placeholders) ? row.placeholders : [];

        if (placeholders.length === 0) {
          return <span>-</span>;
        }

        return (
          <div className="flex max-w-xs flex-wrap gap-1">
            {placeholders.map((item: string) => (
              <span
                key={`${row.id}-${item}`}
                className="rounded bg-slate-200 px-2 pt-1 pb-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                {item}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'body',
      header: 'Message',
      render: (row: any) => (
        <div className="max-w-xl whitespace-pre-wrap break-words text-sm leading-6">
          {row.body || '-'}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => {
        const active =
          row?.status === 'active' ||
          row?.status === 1 ||
          row?.status === true ||
          row?.is_active === 1 ||
          row?.is_active === true;
        return (
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
              active
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
            }`}
          >
            {active ? 'Active' : 'Inactive'}
          </span>
        );
      },
    },
    {
      key: 'updated_at',
      header: 'Updated',
      render: (row: any) => <div>{row.updated_at ? chartDateTime(row.updated_at) : '-'}</div>,
    },
    {
      key: 'actions',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => handlePreview(row)}
            className="text-slate-500 transition hover:text-blue-500"
          >
            <FiEye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(ROUTES.sms_template_edit.replace(':id', String(row.id)))
            }
            className="text-slate-500 transition hover:text-emerald-500"
          >
            <FiEdit2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <HelmetTitle title="SMS Template List" />

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SelectOption onChange={handleSelectChange} />
          <div className="flex">
            <SearchInput
              search={searchInput}
              setSearchValue={setSearchInput}
              className="text-nowrap"
            />
            <ButtonLoading
              onClick={handleSearch}
              label="Search"
              className="h-9 whitespace-nowrap"
            />
          </div>
        </div>

        <Link to={ROUTES.sms_template_create} className="h-9 whitespace-nowrap">
          <FiPlus className="mr-2 text-white text-lg" />
          New Template
        </Link>
      </div>

      <div className="relative overflow-x-auto">
        {smsState?.templatesLoading ? <Loader /> : null}
        <Table columns={columns} data={tableData} noDataMessage="No SMS templates found." />
      </div>

      {totalPages > 1 ? (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          handlePageChange={handlePageChange}
        />
      ) : null}

      <SmsTemplatePreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        loading={smsState?.preview?.loading}
        error={smsState?.preview?.error}
        content={smsState?.preview?.content}
      />
    </>
  );
};

export default SmsTemplateList;
