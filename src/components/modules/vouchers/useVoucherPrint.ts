export const useVoucherPrint = (registryRef: any) => {
  const handleVoucherPrint = (row: any) => {
    if (!registryRef?.current) return;
    registryRef.current.printVoucher(row);
  };

  return { handleVoucherPrint };
};