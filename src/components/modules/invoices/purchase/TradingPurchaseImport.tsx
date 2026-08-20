import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiCheck, FiDownload, FiEdit2, FiRefreshCcw, FiSearch, FiUpload } from 'react-icons/fi';
import HelmetTitle from '../../../utils/others/HelmetTitle';
import { ButtonLoading } from '../../../../pages/UiElements/CustomButtons';
import InputElement from '../../../utils/fields/InputElement';
import thousandSeparator from '../../../utils/utils-functions/thousandSeparator';
import { getDdlProduct } from '../../product/productSlice';
import { getDdlOrders } from '../../orders/ordersSlice';
import { purchaseStore } from './tradingPurchaseSlice';
import { API_CHART_OF_ACCOUNTS_DDL_L4_URL } from '../../../services/apiRoutes';
import { getToken } from '../../../../features/authReducer';
import { Input, Textarea } from '../../../utils/fields/FormControls';

interface ImportRow {
  slNo: string;
  supplier: string;
  product: string;
  qty: number;
  rate: number;
  weightVariance: number | '';
  payment: number;
  truckNumber: string;
  orderNumber: string;
  notes: string;
}

interface PreviewRow extends ImportRow {
  supplierId: number | string;
  supplierName: string;
  productId: number | string;
  productName: string;
  unit: string;
  orderId: number | string;
  orderText: string;
  errors: string[];
}

interface PreviewData {
  rows: PreviewRow[];
  errors: string[];
}

const importColumns = [
  'Sl. No',
  'Supplier',
  'Product',
  'Qty',
  'Rate',
  'Weight Variance',
  'Payment',
  'Truck Number',
  'Order Number',
  'Notes',
];
const importHeaderText = importColumns.join('\t');

const normalizeText = (value: any) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const normalizeHeader = (value: string) =>
  normalizeText(value).replace(/[\s_-]+/g, '');

const isImportHeaderLine = (line: string) => {
  const normalizedLine = normalizeHeader(line);
  return (
    normalizedLine.includes('supplier') &&
    normalizedLine.includes('product') &&
    normalizedLine.includes('qty')
  );
};

const normalizeOrderText = (value: any) =>
  normalizeText(value).replace(/[\s_-]+/g, '');

const parseNumber = (value: string) =>
  Number(String(value ?? '').replace(/,/g, '').trim()) || 0;

const parseOptionalNumber = (value: string): number | '' => {
  const trimmedValue = String(value ?? '').replace(/,/g, '').trim();
  return trimmedValue === '' ? '' : Number(trimmedValue) || 0;
};

const splitDelimitedLine = (line: string, delimiter: string) => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
};

const getValue = (row: Record<string, string>, aliases: string[]) => {
  for (const alias of aliases) {
    if (row[alias] !== undefined) return row[alias];
  }

  return '';
};

const parseImportRows = (rawText: string): ImportRow[] => {
  const sourceLines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const lines =
    sourceLines.length > 0 && !isImportHeaderLine(sourceLines[0])
      ? [importHeaderText, ...sourceLines]
      : sourceLines;

  if (lines.length < 2) return [];

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = splitDelimitedLine(lines[0], delimiter).map(normalizeHeader);

  return lines.slice(1).map((line) => {
    const values = splitDelimitedLine(line, delimiter);
    const row = headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? '';
      return acc;
    }, {});

    return {
      slNo: getValue(row, ['slno', 'serial', 'serialno']),
      supplier: getValue(row, ['supplier', 'customer', 'party', 'client']),
      product: getValue(row, ['product', 'productname', 'item', 'itemname']),
      qty: parseNumber(getValue(row, ['qty', 'quantity'])),
      rate: parseNumber(getValue(row, ['rate', 'price', 'purchaserate', 'purchaseprice'])),
      weightVariance: parseOptionalNumber(
        getValue(row, ['weightvariance', 'variance', 'weightvarience']),
      ),
      payment: parseNumber(getValue(row, ['payment', 'paymentamount', 'paid'])),
      truckNumber: getValue(row, ['trucknumber', 'truckno', 'vehicle', 'vehiclenumber']),
      orderNumber: getValue(row, ['ordernumber', 'orderno', 'order']),
      notes: getValue(row, ['notes', 'note', 'remarks', 'remark']),
    };
  });
};

const worksheetRowsToText = (rows: any[][]) =>
  rows
    .filter((row) =>
      row.some((cell) => String(cell ?? '').trim() !== ''),
    )
    .map((row) =>
      row
        .map((cell) => String(cell ?? '').trim())
        .join('\t'),
    )
    .join('\n');

const getVarianceType = (value: number | '') => {
  if (value === '') return '';
  if (value < 0) return '-';
  if (value > 0) return '+';
  return '';
};

const getVarianceValue = (value: number | '') =>
  value === '' || value === 0 ? '' : String(Math.abs(value));

const hasImportOrderNumber = (orderNumber: string) => {
  const normalizedOrderNumber = normalizeText(orderNumber);
  return normalizedOrderNumber !== '' && normalizedOrderNumber !== '-';
};

const TradingPurchaseImport = () => {
  const dispatch = useDispatch();
  const purchase = useSelector((state: any) => state.tradingPurchase);
  const [rawText, setRawText] = useState('');
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [showPasteBox, setShowPasteBox] = useState(false);

  const resolveSupplier = async (supplierName: string) => {
    if (!supplierName) return null;

    const token = getToken();
    const response = await fetch(
      `${API_CHART_OF_ACCOUNTS_DDL_L4_URL}?searchName=${encodeURIComponent(supplierName)}&acType=3`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const responseData = await response.json();
    const options = responseData?.data?.data;
    const normalizedSupplier = normalizeText(supplierName);

    return Array.isArray(options)
      ? options.find(
        (item: any) =>
          normalizeText(item?.label) === normalizedSupplier ||
          normalizeText(item?.label).includes(normalizedSupplier) ||
          normalizedSupplier.includes(normalizeText(item?.label)),
      ) ?? options[0]
      : null;
  };

  const resolveProduct = async (productName: string) => {
    if (!productName) return null;

    const response: any = await dispatch(getDdlProduct(productName));
    const options = Array.isArray(response?.payload) ? response.payload : [];
    const normalizedProduct = normalizeText(productName);

    return (
      options.find(
        (item: any) =>
          normalizeText(item?.label) === normalizedProduct ||
          normalizeText(item?.label).includes(normalizedProduct) ||
          normalizedProduct.includes(normalizeText(item?.label)),
      ) ?? options[0] ?? null
    );
  };

  const resolveOrder = async (orderNumber: string) => {
    if (!hasImportOrderNumber(orderNumber)) return null;

    const response: any = await dispatch(
      getDdlOrders(orderNumber, {
        orderType: '1',
      }),
    );
    const options = Array.isArray(response?.payload) ? response.payload : [];
    const normalizedOrderNumber = normalizeOrderText(orderNumber);

    return (
      options.find((item: any) => {
        const candidates = [
          item?.label,
          item?.order_number,
          item?.order_no,
          item?.label_1,
        ].map(normalizeOrderText);

        return candidates.some(
          (candidate) =>
            candidate === normalizedOrderNumber ||
            candidate.endsWith(normalizedOrderNumber) ||
            candidate.includes(normalizedOrderNumber),
        );
      }) ?? null
    );
  };

  const buildPreview = async () => {
    const rows = parseImportRows(rawText);

    if (rows.length === 0) {
      toast.info('Please paste Excel rows with header first.');
      setPreview(null);
      return;
    }

    setIsPreviewLoading(true);

    try {
      const previewRows: PreviewRow[] = [];
      const errors: string[] = [];
      const supplierCache = new Map<string, any>();
      const productCache = new Map<string, any>();
      const orderCache = new Map<string, any>();

      for (const row of rows) {
        const rowErrors: string[] = [];
        const supplierKey = normalizeText(row.supplier);
        const productKey = normalizeText(row.product);
        const orderKey = normalizeOrderText(row.orderNumber);

        if (!supplierCache.has(supplierKey)) {
          supplierCache.set(supplierKey, await resolveSupplier(row.supplier));
        }
        if (!productCache.has(productKey)) {
          productCache.set(productKey, await resolveProduct(row.product));
        }
        if (hasImportOrderNumber(row.orderNumber) && !orderCache.has(orderKey)) {
          orderCache.set(orderKey, await resolveOrder(row.orderNumber));
        }

        const supplier = supplierCache.get(supplierKey);
        const product = productCache.get(productKey);
        const order = hasImportOrderNumber(row.orderNumber)
          ? orderCache.get(orderKey)
          : null;

        if (!row.supplier) rowErrors.push('Supplier missing');
        if (!supplier) rowErrors.push(`Supplier not found: ${row.supplier || '-'}`);
        if (!product) rowErrors.push(`Product not found: ${row.product || '-'}`);
        if (hasImportOrderNumber(row.orderNumber) && !order) {
          rowErrors.push(`Order not found: ${row.orderNumber}`);
        }
        if (row.qty <= 0) rowErrors.push('Qty must be greater than 0');
        if (row.rate <= 0) rowErrors.push('Rate must be greater than 0');

        previewRows.push({
          ...row,
          supplierId: supplier?.value ?? '',
          supplierName: supplier?.label ?? row.supplier,
          productId: product?.value ?? '',
          productName: product?.label ?? row.product,
          unit: product?.label_5 ?? '',
          orderId: order?.value ?? '',
          orderText: order?.label ?? row.orderNumber,
          errors: rowErrors,
        });
      }

      setPreview({
        rows: previewRows,
        errors,
      });
    } catch (error) {
      toast.error('Import preview failed.');
      setPreview(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.toLowerCase().endsWith('.xlsx')) {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, {
        header: 1,
        defval: '',
      });
      setRawText(worksheetRowsToText(rows));
      setPreview(null);
      e.target.value = '';
      return;
    }

    setRawText(await file.text());
    setPreview(null);
    e.target.value = '';
  };

  const downloadExcelFormat = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      importColumns,
      ['', '', '', '', '', '', '', '', '', ''],
    ]);

    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 28 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 28 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Import');
    XLSX.writeFile(workbook, 'trading-purchase-import-format.xlsx');
  };

  const saveImportedPurchase = async () => {
    if (!preview) {
      toast.info('Please preview the import first.');
      return;
    }

    const allErrors = [
      ...preview.errors,
      ...preview.rows.flatMap((row) => row.errors),
    ];

    if (allErrors.length > 0) {
      toast.error('Please fix import errors before saving.');
      return;
    }

    setIsSaveLoading(true);

    try {
      for (const [index, row] of preview.rows.entries()) {
        const payload = {
          mtmId: '',
          account: String(row.supplierId),
          accountName: row.supplierName,
          paymentAmt: String(row.payment || 0),
          discountAmt: 0,
          purchaseOrderNumber: row.orderId ? String(row.orderId) : '',
          purchaseOrderText: row.orderId ? row.orderText : '',
          invoice_no: '',
          invoice_date: '',
          vehicleNumber: row.truckNumber,
          notes: row.notes,
          currentProduct: null,
          searchInvoice: '',
          products: [
            {
              id: Date.now() + index,
              product: Number(row.productId),
              product_name: row.productName,
              unit: row.unit,
              qty: row.qty,
              price: row.rate,
              bag: '',
              warehouse: '',
              variance: getVarianceValue(row.weightVariance),
              variance_type: getVarianceType(row.weightVariance),
            },
          ],
        };

        await new Promise<void>((resolve) => {
          dispatch(
            purchaseStore(payload, () => {
              resolve();
            }),
          );
        });
      }

      toast.success(`${preview.rows.length} purchase invoices imported successfully.`);
      setPreview(null);
      setRawText('');
    } finally {
      setIsSaveLoading(false);
    }
  };

  const totalAmount =
    preview?.rows.reduce((sum, row) => sum + row.qty * row.rate, 0) ?? 0;
  const totalPayment =
    preview?.rows.reduce((sum, row) => sum + row.payment, 0) ?? 0;
  const importedRows = preview ? [] : parseImportRows(rawText);

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <HelmetTitle title="Trading Purchase Invoice Import" screen="purchase-import.trading" />
      </div>
      {purchase.isLoading ? <div className="mb-2 text-sm dark:text-[rgb(var(--c-text))]">Saving...</div> : null}
      <div className="grid grid-cols-1 gap-4">
        {!preview && (
          <div>
            <div className="rounded-sm p-4 shadow-default">
              <div className="mb-3 flex items-center justify-end gap-2">
                <ButtonLoading
                  onClick={downloadExcelFormat}
                  buttonLoading={false}
                  label="Download Format"
                  className="px-4 py-2"
                  icon={<FiDownload className="" />}
                />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded bg-primary px-3 py-2 text-sm font-medium text-white">
                  <FiUpload />
                  Upload
                  <Input
                    type="file"
                    accept=".xlsx,.csv,.txt,.tsv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
                <ButtonLoading
                  onClick={() => setShowPasteBox((current) => !current)}
                  buttonLoading={false}
                  label={showPasteBox ? 'Hide Paste Box' : 'Paste Rows'}
                  className="px-4 py-2"
                  icon={<FiEdit2 className="" />}
                />
              </div>
              <div className="mb-3 overflow-x-auto rounded border border-stroke dark:border-form-strokedark">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-[rgb(var(--c-table-head))] text-xs uppercase text-gray-700 dark:text-gray-200">
                    <tr>
                      {importColumns.map((column) => (
                        <th key={column} className="px-3 py-2">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stroke dark:divide-strokedark">
                    {importedRows.length > 0 ? (
                      importedRows.map((row, index) => (
                        <tr key={`${row.slNo || index}-${row.supplier}-${row.product}`} className="dark:text-[rgb(var(--c-text))]">
                          <td className="px-3 py-2 text-center">{row.slNo || index + 1}</td>
                          <td className="px-3 py-2">{row.supplier}</td>
                          <td className="px-3 py-2">{row.product}</td>
                          <td className="px-3 py-2 text-right">{ thousandSeparator(row.qty) || '-'}</td>
                          <td className="px-3 py-2 text-right">{ thousandSeparator(row.rate) || '-'}</td>
                          <td className="px-3 py-2 text-right">
                            {row.weightVariance === '' ? '-' : row.weightVariance}
                          </td>
                          <td className="px-3 py-2 text-right">{ thousandSeparator(row.payment) || '-'}</td>
                          <td className="px-3 py-2">{row.truckNumber || '-'}</td>
                          <td className="px-3 py-2">{row.orderNumber || '-'}</td>
                          <td className="px-3 py-2">{row.notes || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3 py-4 text-center text-gray-500 dark:text-gray-400" colSpan={importColumns.length}>
                          Paste or upload Excel rows to preview imported data here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {showPasteBox && (
                <Textarea
                  value={rawText}
                  onChange={(e) => {
                    setRawText(e.target.value);
                    setPreview(null);
                  }}
                  placeholder="Paste Excel rows here"
                  className="h-40 w-full rounded border border-stroke bg-white p-3 text-sm text-[rgb(var(--c-text))] outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-[rgb(var(--c-text))]"
                />
              )}
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ButtonLoading
                  onClick={buildPreview}
                  buttonLoading={isPreviewLoading}
                  label={isPreviewLoading ? 'Checking...' : 'Check with Software'}
                  className="py-2"
                  icon={<FiSearch className="" />}
                />
                <ButtonLoading
                  onClick={() => {
                    setRawText('');
                    setPreview(null);
                  }}
                  buttonLoading={false}
                  label="Reset"
                  className="py-2"
                  icon={<FiRefreshCcw className="" />}
                />
              </div>
            </div>
          </div>
        )}

        {preview && (
        <div>
          <div className="rounded-sm  p-4 shadow-default ">
            <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <InputElement
                name="invoiceCount"
                value={String(preview?.rows.length ?? 0)}
                label="Invoices"
                placeholder="Invoices"
                disabled
                className="py-1"
              />
              <InputElement
                name="total"
                value={thousandSeparator(totalAmount)}
                label="Invoice Total"
                placeholder="Invoice Total"
                disabled
                className="py-1"
              />
              <InputElement
                name="payment"
                value={thousandSeparator(totalPayment)}
                label="Payment Total"
                placeholder="Payment Total"
                disabled
                className="py-1"
              />
            </div>

            {preview?.errors.map((error) => (
              <p key={error} className="mb-1 text-sm text-red-500">
                {error}
              </p>
            ))}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="bg-[rgb(var(--c-table-head))] text-xs uppercase text-gray-700 dark:text-gray-200">
                  <tr>
                    <th className="px-2 py-2">Sl</th>
                    <th className="px-2 py-2">Supplier</th>
                    <th className="px-2 py-2">Product</th>
                    <th className="px-2 py-2 text-right">Qty</th>
                    <th className="px-2 py-2 text-right">Weight Variance</th>
                    <th className="px-2 py-2 text-right">Rate</th>
                    <th className="px-2 py-2 text-right">Total</th>
                    <th className="px-2 py-2 text-right">Payment</th>
                    <th className="px-2 py-2">Truck Number</th>
                    <th className="px-2 py-2">Order</th>
                    <th className="px-2 py-2">Notes</th>
                    <th className="px-2 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview?.rows.map((row, index) => (
                    <tr
                      key={`${row.product}-${index}`}
                      className="border-b bg-white dark:border-gray-700 dark:bg-gray-800"
                    >
                      <td className="px-2 py-2">{row.slNo || index + 1}</td>
                      <td className="px-2 py-2 font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
                        {row.supplierName}
                      </td>
                      <td className="px-2 py-2 font-medium text-gray-900 dark:text-[rgb(var(--c-text))]">
                        {row.productName}
                      </td>
                      <td className="px-2 py-2 text-right">{ thousandSeparator(row.qty) } {row.unit}</td>
                      <td className="px-2 py-2 text-right">
                        {row.weightVariance === '' ? '-' : thousandSeparator(row.weightVariance)}
                      </td>
                      <td className="px-2 py-2 text-right">{thousandSeparator(row.rate)}</td>
                      <td className="px-2 py-2 text-right">
                        {thousandSeparator(row.qty * row.rate)}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {thousandSeparator(row.payment)}
                      </td>
                      <td className="px-2 py-2">{row.truckNumber || '-'}</td>
                      <td className="px-2 py-2">{row.orderId ? row.orderText : row.orderNumber || '-'}</td>
                      <td className="px-2 py-2">{row.notes || '-'}</td>
                      <td className={row.errors.length ? 'px-2 py-2 text-red-500' : 'px-2 py-2 text-green-600'}>
                        {row.errors.length ? row.errors.join(', ') : 'Ready'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <div className="flex gap-2">
                {preview && (
                  <ButtonLoading
                    onClick={() => setPreview(null)}
                    buttonLoading={false}
                    label="Back"
                    className="px-5 py-2"
                    icon={<FiArrowLeft className="" />}
                  />
                )}
                <ButtonLoading
                  onClick={saveImportedPurchase}
                  buttonLoading={isSaveLoading}
                  label={isSaveLoading ? 'Saving...' : 'Save Invoices'}
                  className="px-5 py-2"
                  icon={<FiCheck className="" />}
                  disabled={!preview || isSaveLoading}
                />
              </div>
            </div>
          </div>
        </div>
        )}
      </div>
    </>
  );
};

export default TradingPurchaseImport;

