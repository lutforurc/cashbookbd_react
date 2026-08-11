import { useEffect, useMemo, useState } from 'react';
import { FiEdit2, FiSearch } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Loader from '../../../common/Loader';
import { ButtonLoading } from '../../../pages/UiElements/CustomButtons';
import SearchInput from '../../utils/fields/SearchInput';
import HelmetTitle from '../../utils/others/HelmetTitle';
import Table from '../../utils/others/Table';
import Pagination from '../../utils/utils-functions/Pagination';
import SelectOption from '../../utils/utils-functions/SelectOption';
import { resolveAssetUrl } from '../../services/resolveAssetUrl';
import { getCompanies } from './companySlice';

const CompanyList = () => {
  const company = useSelector((state: any) => state.company);
  const environment = useSelector((state: any) => state.settings?.data?.env);
  const settings = useSelector((state: any) => state.settings);  const dispatch = useDispatch<any>();
  const navigate = useNavigate();

  const [search, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [buttonLoading, setButtonLoading] = useState(false);

  const paginatedData = company?.data || {};
  const tableData = useMemo(
    () => (Array.isArray(paginatedData?.data) ? paginatedData.data : []),
    [paginatedData],
  );
  const totalPages = Number(paginatedData?.last_page || 1);

  useEffect(() => {
    dispatch(getCompanies({ page, perPage, search }));
  }, [dispatch, page, perPage]);

  useEffect(() => {
    if (paginatedData?.current_page) {
      setCurrentPage(Number(paginatedData.current_page));
    }
  }, [paginatedData?.current_page]);

  const handleSearchButton = async () => {
    setButtonLoading(true);
    setPage(1);
    setCurrentPage(1);
    await dispatch(getCompanies({ page: 1, perPage, search }));
    setButtonLoading(false);
  };

  const handleSelectChange = (event: any) => {
    const nextPerPage = Number(event.target.value);
    setPerPage(nextPerPage);
    setPage(1);
    setCurrentPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    setCurrentPage(nextPage);
  };

  const handleEdit = (row: any) => {
    const companyId = row?.company_id || row?.id;
    if (companyId) {
      navigate(`/company/company-edit/${companyId}`);
    }
  };

  const columns = [
    {
      key: 'serial',
      header: 'Sl. No.',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (_row: any, index?: number) =>
        ((currentPage - 1) * perPage) + Number(index || 0) + 1,
    },
    {
      key: 'name',
      header: 'Name of Company',
    },
    // Both columns apply the sidebar's fallback — each theme variant falls
    // back to the other — and each chip sits on the background its mode
    // renders against, so the list previews both modes whatever theme it is
    // viewed in.
    {
      key: 'company_logo',
      header: 'Logo',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => {
        const logoUrl = resolveAssetUrl(
          row?.company_logo || row?.company_logo_dark,
          environment,
        );

        return logoUrl ? (
          <img
            src={logoUrl}
            alt={row?.name || 'Company logo'}
            title="Light mode logo"
            className="mx-auto h-10 w-16 rounded border border-slate-200 bg-white object-contain p-1 dark:border-gray-700"
          />
        ) : (
          '-'
        );
      },
    },
    {
      key: 'company_logo_dark',
      header: 'Logo Dark',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => {
        const logoDarkUrl = resolveAssetUrl(
          row?.company_logo_dark || row?.company_logo,
          environment,
        );

        return logoDarkUrl ? (
          <img
            src={logoDarkUrl}
            alt={row?.name ? `${row.name} (dark mode)` : 'Company logo (dark mode)'}
            title="Dark mode logo"
            className="mx-auto h-10 w-16 rounded border border-slate-200 bg-slate-800 object-contain p-1 dark:border-gray-600"
          />
        ) : (
          '-'
        );
      },
    },
    {
      key: 'contact_person',
      header: 'Contact Person',
    },
    {
      key: 'phone',
      header: 'Phone/Mobile',
      render: (row: any) => row?.phone || row?.mobile || '-',
    },
    {
      key: 'action',
      header: 'Action',
      headerClass: 'text-center',
      cellClass: 'text-center',
      render: (row: any) => (
        <button
          type="button"
          onClick={() => handleEdit(row)}
          className="inline-flex h-7 w-7 items-center justify-center rounded text-blue-600 transition hover:bg-blue-50 dark:hover:bg-gray-700"
          title="Edit company"
          aria-label="Edit company"
        >
          <FiEdit2 />
        </button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Company List" screen="company-list" />
      </div>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SelectOption onChange={handleSelectChange} />
          <div className='flex'>
            <SearchInput
            search={search}
            setSearchValue={setSearchValue}
            className="text-nowrap h-9"
          />
          <ButtonLoading
            onClick={handleSearchButton}
            buttonLoading={buttonLoading}
            label="Search"
            icon={<FiSearch />}
            className="whitespace-nowrap h-9 -ml-1"
          />
          </div>
        </div>
      </div>

      <div className="relative overflow-x-auto">
        {company?.isLoading ? <Loader /> : null}
        <Table columns={columns} data={tableData} noDataMessage="No company found" />

        {totalPages > 1 ? (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            handlePageChange={handlePageChange}
          />
        ) : null}
      </div>
    </div>
  );
};

export default CompanyList;
