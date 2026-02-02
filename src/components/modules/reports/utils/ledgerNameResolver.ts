export const getRelevantCoaName = (row: any) => {
    const masters = row?.acc_transaction_master ?? [];

    let cashName: string | null = null;

    for (const master of masters) {
      const details = master?.acc_transaction_details ?? [];

      // 1️⃣ First priority: other than Sales(15) & Cash(17)
      const other = details.find(
        (d: any) => d?.coa4_id !== 15 && d?.coa4_id !== 17
      );

      if (other?.coa_l4?.name) {
        return other.coa_l4.name;
      }

      // 2️⃣ Fallback: Cash (17)
      const cash = details.find((d: any) => d?.coa4_id === 17);
      if (cash?.coa_l4?.name) {
        cashName = cash.coa_l4.name;
      }
    }

    return cashName;
  };