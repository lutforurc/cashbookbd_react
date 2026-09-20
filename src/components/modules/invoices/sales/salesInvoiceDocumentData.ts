import dayjs from 'dayjs';
import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';

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
      order_number: salesMaster?.sales_order?.order_number || '',
      delivery_location: salesMaster?.sales_order?.delivery_location || '',
      vehicle_no: salesMaster?.vehicle_no || '',
      created_by: data?.user?.name || '',
      printed_by: data?.approved_user?.name || data?.user?.name || '',
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
      due_amount: netAmount - receivedAmount,
      amount_words: data?.inword || '',
    },
    products: details.map((row: any, index: number) => ({
      sl: index + 1,
      product_name: row?.product?.name || '',
      category: row?.product?.category?.name || '',
      brand: row?.product?.brand?.name || '',
      description: row?.product?.description || '',
      serial_no: row?.serial_no || '',
      warranty: getWarranty(row?.product?.warranty_days),
      qty: Number(row?.quantity) || 0,
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
