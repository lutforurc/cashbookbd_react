import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';

export type ReturnKind = 'sales_return' | 'purchase_return';

/**
 * The rich payload `electronics/sales/invoice-print` answers with, reshaped
 * into the flat {basic, products, branch} DocumentPrint reads -- for one of the
 * two RETURN papers.
 *
 * ⚠️ NOT the invoice adapters with a different master. A return moves money the
 * other way, and every figure below has to know which way that is:
 *
 *   sales return     the shop pays the customer back -> cash sits on the CREDIT
 *                    of head 17
 *   purchase return  the supplier pays the shop back -> cash sits on the DEBIT
 *
 * Reading the wrong side does not produce a small error, it produces nought on
 * one paper and double on the other, and both look like a plausible number.
 * The direction is therefore written out per kind rather than resolved with a
 * Math.abs -- see the two ledger dumps this was built from, which reconcile to
 * the paisa: sales return 125000 - 2220 = 122800 still owed to the customer,
 * purchase return (75000 - 350) - 25000 = 49650 still owed to the shop.
 *
 * ⚠️ NO `printed_by` HERE, for the reason spelled out in
 * purchaseInvoiceDocumentData.ts: DocumentPrint spreads the session's own
 * printer name over `basic`, so setting it here would show whoever wrote the
 * return instead of whoever is reprinting it today.
 */
export const toReturnDocumentData = (data: any, kind: ReturnKind): DocumentData => {
  const master = kind === 'sales_return' ? data?.sales_return_master : data?.purchase_return_master;
  const details = master?.details || [];

  const transactions = Array.isArray(data?.acc_transaction_master)
    ? data.acc_transaction_master
    : data?.acc_transaction_master
      ? [data.acc_transaction_master]
      : [];
  const trxDetails = transactions.flatMap((t: any) =>
    Array.isArray(t?.acc_transaction_details) ? t.acc_transaction_details : [],
  );

  /**
   * Who the return is with, read off the LEDGER rather than off the return.
   *
   * ⚠️ A return master's own `name` / `mobile` / `address` columns are NULL.
   * The Tiles return screens write the party as `customer_id` / `supplier_id`
   * and nothing else -- and that id is an `acc_coa_level4s` id, not a
   * `cust_party_infos` one, so it will not be found in the party table by `id`
   * either. Read the master alone and the paper prints "Name : -" while the
   * ledger standing next to it knows perfectly well who the party is.
   *
   * Same fallback, for the same reason, as purchaseInvoiceDocumentData.ts.
   */
  const partyId = Number(master?.customer_id ?? master?.supplier_id ?? 0);
  const party =
    trxDetails.find((row: any) => Number(row?.coa4_id) === partyId && row?.coa_l4?.cust_party_infos)
      ?.coa_l4?.cust_party_infos || {};

  const totalAmount = Number(master?.total ?? 0);
  const discountAmount = Number(master?.discount ?? 0);
  const netAmount = totalAmount - discountAmount;

  // Which side of the cash head is the money -- see the note above.
  const cashSide = kind === 'sales_return' ? 'credit' : 'debit';
  const paidAmount = trxDetails
    .filter((row: any) => Number(row?.coa4_id) === 17)
    .reduce((sum: number, row: any) => sum + Number(row?.[cashSide] ?? 0), 0);

  return {
    basic: {
      party_name: master?.name || party?.name || '-',
      mobile: master?.mobile || party?.mobile || '',
      manual_address:
        party?.manual_address || party?.address || master?.manual_address || master?.address || '',
      notes: master?.notes || '',
      vr_no: data?.vr_no,
      vr_date: data?.vr_date,
      // The four handwritten figures, straight off the voucher -- the Tiles
      // return screens have the same four boxes its invoice does. All four are
      // hideIfEmpty on the paper, so a branch that leaves them blank prints
      // none of them.
      manual_voucher_no: data?.manual_voucher_no || '',
      manual_voucher_date: data?.manual_voucher_date || '',
      manual_challan_no: data?.manual_challan_no || '',
      manual_challan_date: data?.manual_challan_date || '',
      created_by: data?.user?.name || '',
      /**
       * ⚠️ TWO PAIRS OF NAMES FOR TWO FIGURES, and not a belt-and-braces habit.
       *
       * Each return paper is derived from its invoice, and the two invoices name
       * the same money differently in their totals band:
       *
       *                    the gross        what changed hands
       *   sales invoice    grand_total      received_amount
       *   purchase invoice total_amount     paid_amount
       *
       * A return paper asks for its own invoice's name, so this adapter answers
       * under BOTH. Send only one of a pair and the other paper prints its label
       * with nothing after it -- the owner found both of them by looking at the
       * paper: first the money line, then "Total Tk.".
       *
       * What differs between the two papers is the WORD on the money line, and
       * that is the template's business, not this adapter's: "Paid Tk." on a
       * sales return, "Received Tk." on a purchase return. See returnPaper().
       */
      grand_total: totalAmount,
      total_amount: totalAmount,
      discount_amount: discountAmount,
      net_amount: netAmount,
      paid_amount: paidAmount,
      received_amount: paidAmount,
      due_amount: Math.max(netAmount - paidAmount, 0),
      amount_words: data?.inword || '',
    },
    products: details.map((row: any, index: number) => {
      const qty = Number(row?.quantity) || 0;
      const price = Number(row?.return_price) || 0;

      return {
        sl: index + 1,
        product_name: row?.product?.name || '',
        category: row?.product?.category?.name || '',
        brand: row?.product?.brand?.name || '',
        group: row?.product?.group?.name || '',
        code: row?.product?.code || '',
        description: row?.product?.description || '',
        serial_no: row?.serial_no || '',
        qty,
        unit: row?.product?.unit?.name || '',
        price,
        amount: qty * price,
      };
    }),
    branch: {
      name: data?.branch?.name,
      address: data?.branch?.address,
      phone: data?.branch?.phone,
    } as any,
  };
};
