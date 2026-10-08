import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';
import numberToWords from '../../../utils/utils-functions/numberToWords';

/**
 * The rich, relation-laden payload `electronics/sales/invoice-print` answers
 * with (shared, unchanged, with three other print components -- see the plan
 * task this came from) reshaped into the flat {basic, products, installments,
 * branch} the Print Template Designer's field catalogue reads by key.
 *
 * Ported from getSalesMeta() in the bespoke component this replaces --
 * ElectronicsSalesInvoicePrintBase.tsx:117-157 -- rather than rewritten, since
 * that logic (customer resolution, the three extra-charge lines by coa4_id,
 * the grand total) is already correct against real data.
 */
export const toSalesInvoiceDocumentData = (data: any): DocumentData => {
  const salesMaster = data?.sales_master;
  const details = salesMaster?.details || [];
  const transactions = Array.isArray(data?.acc_transaction_master)
    ? data.acc_transaction_master
    : data?.acc_transaction_master
      ? [data.acc_transaction_master]
      : [];
  const trxDetails = transactions.flatMap(
    (t: any) => (Array.isArray(t?.acc_transaction_details) ? t.acc_transaction_details : []),
  );

  const received = trxDetails.find((d: any) => d.coa4_id === 17);
  const discount = trxDetails.find((d: any) => d.coa4_id === 23);
  const tds = trxDetails.find((d: any) => d.coa4_id === 41);
  const serviceCharge = trxDetails.find((d: any) => d.coa4_id === 42);
  const carryingOutward = trxDetails.find((d: any) => d.coa4_id === 198);

  const customerId = Number(salesMaster?.customer_id);
  const customerDetail =
    trxDetails.find(
      (d: any) => Number(d?.coa4_id) === customerId || Number(d?.coa_l4?.id) === customerId,
    ) || trxDetails.find((d: any) => d?.coa_l4?.cust_party_infos);
  const customerInfo = customerDetail?.coa_l4?.cust_party_infos || {};

  const grandTotal = details.reduce(
    (sum: number, d: any) => sum + Number(d.quantity) * Number(d.sales_price),
    0,
  );
  const tdsAmount = tds ? Number(tds.credit) : 0;
  const serviceChargeAmount = serviceCharge ? Number(serviceCharge.credit) : 0;
  const carryingOutwardAmount = carryingOutward ? Number(carryingOutward.credit) : 0;
  const discountAmount = discount ? Number(discount.debit) : 0;
  const receivedAmount = received ? Number(received.debit) : 0;
  const netAmount = grandTotal + tdsAmount + serviceChargeAmount + carryingOutwardAmount - discountAmount;
  const dueAmount = netAmount - receivedAmount;

  // What the party owed BEFORE this bill -- the server's own figure, summed
  // from the party's ledger with this voucher left out. Absent on a server
  // that predates the key, and on a cash customer, whose account is the drawer
  // and not a due; both print nothing rather than a wrong nought (the
  // catalogue's two due lines carry hideIfEmpty).
  const previousDue = Number(data?.previous_due) || 0;

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
      party_name: salesMaster?.name || customerInfo?.name || customerDetail?.coa_l4?.name || '-',
      mobile: salesMaster?.mobile || customerInfo?.mobile || '',
      manual_address:
        customerInfo?.manual_address ||
        customerDetail?.coa_l4?.manual_address ||
        salesMaster?.manual_address ||
        salesMaster?.customer_address ||
        customerInfo?.address ||
        salesMaster?.address ||
        '',
      notes: salesMaster?.notes || '',
      vr_no: data?.vr_no,
      vr_date: data?.vr_date,
      // Raw 'YYYY-MM-DD', never reformatted here: the designer's date fields
      // format them, and a 'DD/MM/YYYY' string is not a date dayjs can read.
      // A trade that has none of these sends null, and the fields that carry
      // hideIfEmpty then print nothing at all.
      manual_voucher_no: data?.manual_voucher_no || '',
      manual_voucher_date: data?.manual_voucher_date || '',
      manual_challan_no: data?.manual_challan_no || '',
      manual_challan_date: data?.manual_challan_date || '',
      order_number: salesMaster?.sales_order?.order_number || '',
      delivery_location: salesMaster?.sales_order?.delivery_location || '',
      vehicle_no: salesMaster?.vehicle_no || '',
      created_by: data?.user?.name || '',
      grand_total: grandTotal,
      tds_name: tds ? tds.coa_l4?.name : '',
      tds_amount: tdsAmount,
      service_charge_name: serviceCharge ? serviceCharge.coa_l4?.name : '',
      service_charge_amount: serviceChargeAmount,
      carrying_outward_name: carryingOutward ? carryingOutward.coa_l4?.name : '',
      carrying_outward_amount: carryingOutwardAmount,
      discount_amount: discountAmount,
      net_amount: netAmount,
      received_amount: receivedAmount,
      due_amount: dueAmount,
      previous_due: previousDue,
      // The running outstanding, the figure the Tiles sales screen totalled
      // into its Total Tk.: what was already owed, plus what this bill leaves.
      final_due: previousDue + dueAmount,
      // ⚠️ NOT final_due. The shop's "Grand Total" is what the bill comes to on
      // top of the old balance -- the NET plus the previous due -- where
      // final_due takes the bill's DUE (net less what was paid today). On a bill
      // paid in full the two differ by the whole payment: net + previous due is
      // what a khata is settled against, final_due is what is still owed.
      net_plus_previous: netAmount + previousDue,
      // From net_amount here rather than the server's `inword`, which leaves
      // out carrying outward (coa4 198) and so could disagree with the Net line
      // printed right above it.
      amount_words: netAmount ? `${numberToWords(netAmount)} Only` : '',
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
      price: Number(row?.sales_price) || 0,
      amount: (Number(row?.quantity) || 0) * (Number(row?.sales_price) || 0),
    })),
    installments: Array.isArray(data?.installments)
      ? data.installments.map((inst: any) => ({
          due_date: inst?.due_date,
          amount: Number(inst?.amount) || 0,
        }))
      : [],
    branch: {
      name: data?.branch?.name,
      address: data?.branch?.address,
      phone: data?.branch?.phone,
    } as any,
  };
};
