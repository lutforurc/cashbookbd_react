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
 * A sales order that never happened, for the same preview.
 *
 * Its rows are deliveries rather than products, so `qty`, `price` and `amount`
 * mean what one lorry-load carried, cost and came to. `due` is running, exactly
 * as the real payload builds it -- what is still owed after this delivery and
 * every one above it -- because a sample with a per-row due would let somebody
 * design a column that reads quite differently once real figures arrive.
 */
export const SAMPLE_ORDER_DOCUMENT: DocumentData = {
  basic: {
    order_for: 'Sample Poultry Group',
    address: 'Sample House, Mohakhali CA, Dhaka',
    mobile: '01700000000',
    order_number: 'ORD-001/PO-72',
    order_date: dayjs().format('DD/MM/YYYY'),
    duration: `${dayjs().subtract(1, 'day').format('DD/MM/YYYY')} to ${dayjs().format('DD/MM/YYYY')}`,
    delivery_location: 'Sample Poultry Division, Baniarchala',
    product_name: 'DORB',
    order_rate: 26,
    total_order: 100000,
    order_amount: 2600000,
    unit: 'Kg',
    last_delivery_date: dayjs().format('DD/MM/YYYY'),
    contract_order_qty: 100000,
    trx_quantity: 95685,
    notes: '',
    created_by: 'Sample User',
  },
  products: [
    { id: 1, vr_no: '3-260800151', date: '19/08/2026', vehicle_no: 'DMT 17-0523', qty: 15803, unit: 'Kg', price: 26, amount: 410878, received: 14500, due: 396378 },
    { id: 2, vr_no: '3-260800152', date: '19/08/2026', vehicle_no: 'DMT 16-3336', qty: 16135, unit: 'Kg', price: 26, amount: 419510, received: 11400, due: 804488 },
    { id: 3, vr_no: '3-260800153', date: '19/08/2026', vehicle_no: 'DMT 15-2028', qty: 15673, unit: 'Kg', price: 26, amount: 407498, received: 15100, due: 1196886 },
    { id: 4, vr_no: '3-260800154', date: '19/08/2026', vehicle_no: 'DMT 24-7837', qty: 16313, unit: 'Kg', price: 26, amount: 424138, received: 15500, due: 1605524 },
    { id: 5, vr_no: '3-260800155', date: '20/08/2026', vehicle_no: 'BGT 11-1323', qty: 15828, unit: 'Kg', price: 26, amount: 411528, received: 15000, due: 2002052 },
    { id: 6, vr_no: '3-260800156', date: '20/08/2026', vehicle_no: 'DMT 12-9860', qty: 15933, unit: 'Kg', price: 26, amount: 414330, received: 14500, due: 2401882 },
  ],
};
