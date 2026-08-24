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
