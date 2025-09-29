class PurchaseLedgerCalculator {
  private tableData: any[];

  constructor(tableData: any[]) {
    this.tableData = tableData || [];
  }

  // Total Quantity
  getTotalQuantity(): number {
    return this.tableData.reduce((sum, row) => {
      const rowTotal = row?.purchase_master?.details?.reduce(
        (subSum: number, detail: any) =>
          subSum + (Number(detail?.quantity) || 0),
        0,
      ) || 0;
      return sum + rowTotal;
    }, 0);
  }

  // Total Payment
  getTotalPayment(): number {
    return this.tableData.reduce((sum, row) => {
      const rowTotal = row?.purchase_master?.details?.reduce(
        (subSum: number, detail: any) =>
          subSum + (Number(detail?.purchase_price) || 0) * (Number(detail?.quantity) || 0),
        0,
      ) || 0;
      return sum + rowTotal;
    }, 0);
  }

  // Grand Total (Received / Credit)
  getGrandTotal(): number {
    return this.tableData.reduce((sum, row) => {
      const transaction = row?.acc_transaction_master?.find((tm: any) =>
        tm?.acc_transaction_details?.some((d: any) => d?.coa4_id === 17),
      );

      const creditValue =
        transaction?.acc_transaction_details?.find((d: any) => d?.coa4_id === 17)?.credit ||
        0;

      return sum + Number(creditValue);
    }, 0);
  }

  // Grand Discount Total
  getDiscountTotal(): number {
    return this.tableData.reduce((sum, row) => {
      const transaction = row?.acc_transaction_master?.find((tm: any) =>
        tm?.acc_transaction_details?.some((d: any) => d?.coa4_id === 40),
      );

      const creditValue =
        transaction?.acc_transaction_details?.find((d: any) => d?.coa4_id === 40)?.credit ||
        0;

      return sum + Number(creditValue);
    }, 0);
  }
}



export default PurchaseLedgerCalculator;