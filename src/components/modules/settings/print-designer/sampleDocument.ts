import dayjs from 'dayjs';
import type { DocumentData } from '../../../utils/print-designer/DocumentPrint';

/**
 * A challan that never happened, for the designer's preview.
 *
 * Every field the catalogue offers is filled, and none of them are blank: a
 * preview whose sample had holes in it would show a tenant a paper with gaps
 * where their real challans print values, and they would design around the
 * gaps. Real names are avoided for the same reason a test invoice should not
 * carry a real customer's -- somebody eventually prints the preview.
 */
export const SAMPLE_DOCUMENT: DocumentData = {
  basic: {
    party_name: 'Sample Traders Ltd.',
    bangla_name: 'স্যাম্পল ট্রেডার্স লিমিটেড',
    idfr_code: 'C-0142',
    manual_address: '12 Station Road, Sample Bazar, Dhaka',
    areas: 'Sample Bazar',
    area_bangla: 'স্যাম্পল বাজার',
    somity_id: '104',
    mobile: '01700000000',
    vr_no: '3-260800142',
    vr_date: dayjs().format('YYYY-MM-DD'),
    order_no: 'PO-1100025951',
    created_by: 'Sample User',
    notes: 'Handle with care.',
    vehicle_no: 'DHAKA METRO TA-11-2233',
    driver_name: 'Sample Driver',
    driver_mobile: '01800000000',
  },
  products: [
    {
      id: 1,
      product_name: 'Deshi Atta 50 Kg',
      category: 'Flour',
      description: 'Premium grade',
      qty: 320,
      unit: 'Bag',
      bag: 320,
      price: 2450,
      serial_no: '',
      warranty_days: 0,
    },
    {
      id: 2,
      product_name: 'Maida 50 Kg',
      category: 'Flour',
      description: 'Fine milled',
      qty: 120,
      unit: 'Bag',
      bag: 120,
      price: 2680,
      serial_no: '',
      warranty_days: 0,
    },
    {
      id: 3,
      product_name: 'Soyabean Oil 5 Ltr',
      category: 'Edible Oil',
      description: 'Refined',
      qty: 40,
      unit: 'Carton',
      bag: 0,
      price: 940,
      serial_no: 'SN-8842',
      warranty_days: 180,
    },
  ],
};

/**
 * A hotel bill that never happened.
 *
 * ⚠️ THE ARITHMETIC IS REAL, and it has to be. A tenant lays out a bill by
 * reading this preview, and a sample whose lines did not add to its own total
 * would teach them the totals band is decorative. Two rooms for two nights at
 * 4,200, one laundry charge, 10% service charge and 15% VAT ON THE BASE PLUS
 * THE SERVICE CHARGE (§6.3):
 *
 *   base    16,800 + 349.50   = 17,149.50
 *   service 4 x 420           =  1,680.00
 *   VAT     4 x 693           =  2,772.00
 *   exact                     = 21,601.50
 *   rounded once on the total = 21,602.00, so 0.50 of rounding
 *
 * The half-taka is deliberate: with a round figure the Rounding line would
 * never appear in the preview, and a tenant would not know it exists until a
 * real bill printed one.
 */
export const HOTEL_BILL_SAMPLE: DocumentData = {
  basic: {
    guest_name: 'Sample Guest',
    guest_mobile: '01700000000',
    guest_nid: '1990123456789',
    guest_address: '12 Station Road, Sample Bazar, Dhaka',
    guest_count: 3,
    booker_name: 'Sample Traders Ltd.',
    booker_mobile: '01800000000',
    billed_to: 'Sample Traders Ltd.',

    booking_no: 'BK-2026-00142',
    booking_date: dayjs().format('YYYY-MM-DD'),
    booking_type: 'Corporate',
    booking_status: 'checked out',
    check_in_date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
    check_out_date: dayjs().format('YYYY-MM-DD'),
    nights: 2,
    room_list: 'ANX / 201, ANX / 202',
    room_count: 2,
    stated_adults: 3,
    stated_children: 1,

    notes: 'Late check-out allowed.',
    voucher_no: '5-2608 00007',

    bill_base: 17149.5,
    bill_service_charge: 1680,
    bill_vat: 2772,
    bill_gross: 21601.5,
    bill_rounding: 0.5,
    bill_rounded: 21602,
    bill_paid: 10000,
    bill_due: 11602,
    line_count: 5,
  },
  products: [
    {
      description: 'ANX / 201 — night 1',
      charge_type: 'room rent',
      stay_date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
      room: 'ANX / 201',
      room_facilities: 'Air conditioning, Wi-Fi, Balcony',
      room_description: 'Corner room, lake side.',
      quantity: 1,
      unit_rate: 4200,
      base_amount: 4200,
      service_charge_rate: 10,
      service_charge_amount: 420,
      vat_rate: 15,
      vat_amount: 693,
      line_total: 5313,
    },
    {
      description: 'ANX / 201 — night 2',
      charge_type: 'room rent',
      stay_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
      room: 'ANX / 201',
      room_facilities: 'Air conditioning, Wi-Fi, Balcony',
      room_description: 'Corner room, lake side.',
      quantity: 1,
      unit_rate: 4200,
      base_amount: 4200,
      service_charge_rate: 10,
      service_charge_amount: 420,
      vat_rate: 15,
      vat_amount: 693,
      line_total: 5313,
    },
    {
      description: 'ANX / 202 — night 1',
      charge_type: 'room rent',
      stay_date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
      room: 'ANX / 202',
      room_facilities: 'Air conditioning, Wi-Fi',
      room_description: 'Twin beds, garden side.',
      quantity: 1,
      unit_rate: 4200,
      base_amount: 4200,
      service_charge_rate: 10,
      service_charge_amount: 420,
      vat_rate: 15,
      vat_amount: 693,
      line_total: 5313,
    },
    {
      description: 'ANX / 202 — night 2',
      charge_type: 'room rent',
      stay_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
      room: 'ANX / 202',
      room_facilities: 'Air conditioning, Wi-Fi',
      room_description: 'Twin beds, garden side.',
      quantity: 1,
      unit_rate: 4200,
      base_amount: 4200,
      service_charge_rate: 10,
      service_charge_amount: 420,
      vat_rate: 15,
      vat_amount: 693,
      line_total: 5313,
    },
    {
      description: 'Laundry, 3 pieces',
      charge_type: 'laundry',
      stay_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
      // ⚠️ A charge with no room has none of the room's facts either. Filling
      // them in here would teach the designer that the columns are always
      // populated, and the first real bill with a laundry line would print two
      // blank cells nobody had planned for.
      room: null,
      room_facilities: null,
      room_description: null,
      quantity: 3,
      unit_rate: 116.5,
      base_amount: 349.5,
      service_charge_rate: 0,
      service_charge_amount: 0,
      vat_rate: 0,
      vat_amount: 0,
      line_total: 349.5,
    },
  ],
};

/**
 * A money receipt that never happened.
 *
 * ⚠️ NO TAX FIGURE, and `products` is empty. Both are the point rather than an
 * omission: a receipt is proof that money arrived, and one carrying a VAT line
 * becomes a VAT invoice for a stay that has not happened (OPEN-12, settled
 * 2026-08-26). The receipt's field catalogue offers neither, so a tenant
 * cannot put them back in the designer.
 */
export const HOTEL_RECEIPT_SAMPLE: DocumentData = {
  basic: {
    guest_name: 'Sample Guest',
    guest_mobile: '01700000000',
    booker_name: 'Sample Traders Ltd.',

    booking_no: 'BK-2026-00142',
    check_in_date: dayjs().format('YYYY-MM-DD'),
    check_out_date: dayjs().add(2, 'day').format('YYYY-MM-DD'),
    nights: 2,
    room_list: 'ANX / 201, ANX / 202',
    room_count: 2,

    payment_no: 'RC-2026-0042',
    payment_date: dayjs().format('YYYY-MM-DD'),
    purpose: 'Advance',
    method: 'Cash',
    reference: '',
    payment_notes: '',
    receipt_amount: 10000,
    receipt_kind: 'Received',
    advance_held: 10000,
    voucher_no: '1-2608 00019',
  },
  products: [],
};

/** Which sample the preview draws for the paper being designed. */
export const sampleFor = (docType: string): DocumentData => {
  if (docType === 'hotel_bill') return HOTEL_BILL_SAMPLE;
  if (docType === 'hotel_money_receipt') return HOTEL_RECEIPT_SAMPLE;
  return SAMPLE_DOCUMENT;
};
