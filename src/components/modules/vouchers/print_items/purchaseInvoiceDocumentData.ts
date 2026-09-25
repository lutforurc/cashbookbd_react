import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';
import numberToWords from '../../../utils/utils-functions/numberToWords';

/**
 * The rich payload `electronics/sales/invoice-print` answers with, reshaped
 * into the flat {basic, products, branch} DocumentPrint reads.
 *
 * Ported from getPurchaseMeta() in PurchaseInvoicePrintBase.tsx:109-153,
 * the bespoke component this replaces.
 *
 * ⚠️ NO `printed_by` HERE. See DocumentPrint.tsx's own comment on why:
 * `basic = {printed_by: printedBy, ...data.basic}` -- the session default is
 * spread over, so setting it here would silently show whoever created or
 * approved the purchase instead of whoever is reprinting it today. This
 * exact mistake was made and caught in the Sales Invoice adapter's review;
 * do not repeat it here.
 */
export const toPurchaseInvoiceDocumentData = (data: any): DocumentData => {
  const purchaseMaster = data?.purchase_master;
  const details = purchaseMaster?.details || [];
  const transactions = Array.isArray(data?.acc_transaction_master)
    ? data.acc_transaction_master
    : data?.acc_transaction_master
      ? [data.acc_transaction_master]
      : [];
  const trxDetails = transactions.flatMap(
    (t: any) => (Array.isArray(t?.acc_transaction_details) ? t.acc_transaction_details : []),
  );

  const supplierFallback =
    trxDetails.find(
      (d: any) =>
        Number(d?.coa4_id) === Number(purchaseMaster?.supplier_id) &&
        d?.coa_l4?.cust_party_infos,
    )?.coa_l4?.cust_party_infos || {};

  const totalAmount = Number(purchaseMaster?.total ?? 0);
  const discountFromLedger = trxDetails
    .filter((row: any) => Number(row?.coa4_id) === 40)
    .reduce((sum: number, row: any) => sum + Number(row?.credit ?? 0), 0);
  const discountAmount = discountFromLedger || Number(purchaseMaster?.discount ?? 0);
  const netAmount = totalAmount - discountAmount;
  const paidAmount = trxDetails
    .filter((row: any) => Number(row?.coa4_id) === 17)
    .reduce((sum: number, row: any) => sum + Number(row?.credit ?? 0), 0);

  const getWarranty = (warranty: any): string => {
    if (!warranty || typeof warranty !== 'object') return '';
    const labelKey = Object.keys(warranty).find((key) => !Number.isNaN(Number(key)));
    const label = labelKey ? warranty[labelKey] : '';
    const dayValue = warranty?.day;
    if (!label || dayValue == null || dayValue === '') return '';
    return `${dayValue} day`;
  };

  return {
    basic: {
      party_name: purchaseMaster?.name || supplierFallback?.name || '-',
      mobile: purchaseMaster?.mobile || supplierFallback?.mobile || '',
      manual_address:
        supplierFallback?.manual_address ||
        purchaseMaster?.manual_address ||
        purchaseMaster?.supplier_address ||
        supplierFallback?.address ||
        purchaseMaster?.address ||
        '',
      notes: purchaseMaster?.notes || '',
      vr_no: data?.vr_no,
      vr_date: purchaseMaster?.invoice_date || purchaseMaster?.transact_date || data?.vr_date,
      order_number: purchaseMaster?.purchase_order?.order_number || '',
      delivery_location: purchaseMaster?.purchase_order?.delivery_location || '',
      vehicle_no: purchaseMaster?.vehicle_no || '',
      created_by: data?.user?.name || '',
      total_amount: totalAmount,
      discount_amount: discountAmount,
      net_amount: netAmount,
      paid_amount: paidAmount,
      due_amount: Math.max(netAmount - paidAmount, 0),
      // Same fallback as PurchaseInvoicePrintBase's own paper: the Net, never
      // the lines before the discount.
      amount_words:
        data?.inword || purchaseMaster?.inword || (netAmount ? `${numberToWords(netAmount)} Only` : ''),
    },
    products: details.map((row: any, index: number) => ({
      sl: index + 1,
      product_name: row?.product?.name || '',
      category: row?.product?.category?.name || '',
      brand: row?.product?.brand?.name || '',
      group: row?.product?.group?.name || '',
      code: row?.product?.code || '',
      description: row?.product?.description || '',
      serial_no: row?.serial_no || '',
      warranty: getWarranty(row?.product?.warranty_days),
      qty: Number(row?.quantity) || 0,
      unit: row?.product?.unit?.name || '',
      price: Number(row?.purchase_price) || 0,
      amount: (Number(row?.quantity) || 0) * (Number(row?.purchase_price) || 0),
    })),
    branch: {
      name: data?.branch?.name,
      address: data?.branch?.address,
      phone: data?.branch?.phone,
    } as any,
  };
};
