export * from './voucherTypes';
export * from './voucherUtils';
export * from './voucherApiMap';
export * from './voucherPrintMap';
export * from './useVoucherPrint';


// At first check have the variables and imports been declared or not
// row.mtm_id -------------------- Its very important to have this variable in the row object


// Print workflow
// Import the two files 
// import { useVoucherPrint } from '../../vouchers/useVoucherPrint';
// import { VoucherPrintRegistry } from '../../vouchers/VoucherPrintRegistry';


// declare the two variables
// const voucherRegistryRef = useRef<any>(null);
// const { handleVoucherPrint } = useVoucherPrint(voucherRegistryRef);

// In the columns definition, wrap the vr_no with a clickable div
// {
//   key: 'vr_no',
//   render: (row: any) => (
//     <div
//       className="cursor-pointer hover:underline"
//       onClick={() => handleVoucherPrint(row)} // and call this function on click
//     >
//       {row.vr_no}
//     </div>
//   ),
// }

// Finally, include the VoucherPrintRegistry component somewhere in your JSX
// <VoucherPrintRegistry
//   ref={voucherRegistryRef}
//   rowsPerPage={Number(perPage)}
//   fontSize={Number(fontSize)}
// />