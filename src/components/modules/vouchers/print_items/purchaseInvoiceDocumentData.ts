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

  const totalAmount = details.reduce(
    (sum: number, row: any) =>
      sum + (Number(row?.quantity) || 0) * (Number(row?.purchase_price) || 0),
    0,
  ) || Number(purchaseMaster?.total ?? 0);
  const discountFromLedger = trxDetails
    .filter((row: any) => Number(row?.coa4_id) === 40)
    .reduce((sum: number, row: any) => sum + Number(row?.credit ?? 0), 0);
  const discountAmount = discountFromLedger || Number(purchaseMaster?.discount ?? 0);

  // The three charges this screen can put on a bill. Either side is read: a
  // purchase posts each as a DEBIT on its own head, but these are the same heads
  // the sales paper credits, and the server may write them the other way round.
  // Carriage is 197 here and 198 on a chart that keeps the sales head for it.
  // Absent on a bill saved before the screen offered them, which is what keeps
  // an old invoice printing exactly as it did.
  const chargeAmount = (...targets: number[]) => {
    for (const target of targets) {
      const row = trxDetails.find((entry: any) => Number(entry?.coa4_id) === target);
      if (row) return Number(row.debit) || Number(row.credit) || 0;
    }
    return 0;
  };
  const chargeName = (...targets: number[]) => {
    for (const target of targets) {
      const row = trxDetails.find((entry: any) => Number(entry?.coa4_id) === target);
      if (row) return row?.coa_l4?.name || '';
    }
    return '';
  };

  const carryingInwardAmount = chargeAmount(197, 198);
  const tdsAmount = chargeAmount(41);
  const serviceChargeAmount = chargeAmount(42);

  const netAmount =
    totalAmount + carryingInwardAmount + tdsAmount + serviceChargeAmount - discountAmount;
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
      // ⚠️ THE SAME FOUR THE SALES INVOICE READS, off the same `data` -- see
      // salesInvoiceDocumentData.ts. They are columns on the `main_trx_master`
      // row being printed, so they arrive at the payload's top level whatever
      // the voucher type; a branch that never fills them in sends null, and the
      // four fields carrying hideIfEmpty then print nothing at all. Raw
      // 'YYYY-MM-DD', never reformatted here: the designer's date fields format
      // them, and a 'DD/MM/YYYY' string is not a date dayjs can read.
      manual_voucher_no: data?.manual_voucher_no || '',
      manual_voucher_date: data?.manual_voucher_date || '',
      manual_challan_no: data?.manual_challan_no || '',
      manual_challan_date: data?.manual_challan_date || '',
      order_number: purchaseMaster?.purchase_order?.order_number || '',
      delivery_location: purchaseMaster?.purchase_order?.delivery_location || '',
      vehicle_no: purchaseMaster?.vehicle_no || '',
      created_by: data?.user?.name || '',
      total_amount: totalAmount,
      // Named by the account each one posted to, exactly as the sales paper
      // does -- the designer's label reads "{tds_name} Tk." and the branch's
      // own wording for coa4 41 appears there, not a word written here.
      tds_name: chargeName(41),
      tds_amount: tdsAmount,
      service_charge_name: chargeName(42),
      service_charge_amount: serviceChargeAmount,
      carrying_inward_name: chargeName(197, 198),
      carrying_inward_amount: carryingInwardAmount,
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
      // The supplier's gift on a Production Purchase, marked by the API. The
      // word rides on the name, as it does on the sales paper.
      product_name: `${row?.product?.name || ''}${row?.is_free ? ' (ফ্রি)' : ''}`,
      category: row?.product?.category?.name || '',
      brand: row?.product?.brand?.name || '',
      group: row?.product?.group?.name || '',
      code: row?.product?.code || '',
      description: row?.product?.description || '',
      serial_no: row?.serial_no || '',
      warranty: getWarranty(row?.product?.warranty_days),
      qty: Number(row?.quantity) || 0,
      unit: row?.product?.unit?.name || '',
      // The measurement/packaging the purchase line was saved with -- the same
      // snapshot columns the sales line carries (see salesInvoiceDocumentData).
      // NULL on a line saved before the columns existed, which is what leaves
      // the "Meas." cell empty rather than printing a current product value.
      measurement_qty: row?.measurement_qty ?? null,
      measurement_unit: row?.measurement_unit || '',
      packaging_text: row?.packaging_text || '',
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
