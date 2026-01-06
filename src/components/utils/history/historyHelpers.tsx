// helpers/historyHelpers.js
export const normalizeData = (val) => {
  if (!val) return {};
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return {};
    }
  }
  return val;
};

export const getVoucherType = (vrNo) => {
  if (!vrNo) return 0;
  const first = String(vrNo).split("-")[0];
  return Number(first) || 0;
};

const num = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
};

export const extractInvoiceChanges = (oldData, newData) => {
  if (!oldData?.sales_master || !newData?.sales_master) return [];

  const changes = [];
  const oldSales = oldData.sales_master;
  const newSales = newData.sales_master;

  if (oldSales.customer_id !== newSales.customer_id) {
    changes.push({ field: "Customer", old: oldSales.customer_id, new: newSales.customer_id });
  }

  if (num(oldSales.netpayment) !== num(newSales.netpayment)) {
    changes.push({ field: "Net Payment", old: oldSales.netpayment, new: newSales.netpayment });
  }

  const oldItem = oldSales.details?.[0];
  const newItem = newSales.details?.[0];

  if (oldItem && newItem) {
    if (num(oldItem.quantity) !== num(newItem.quantity)) {
      changes.push({ field: "Quantity", old: oldItem.quantity, new: newItem.quantity });
    }
    if (num(oldItem.sales_price) !== num(newItem.sales_price)) {
      changes.push({ field: "Sales Price", old: oldItem.sales_price, new: newItem.sales_price });
    }
  }

  return changes;
};

export const extractPurchaseChanges = (oldData, newData) => {
  if (!oldData?.purchase_master || !newData?.purchase_master) return { summary: [], items: [] };

  const oldPm = oldData.purchase_master;
  const newPm = newData.purchase_master;

  const summary = [];

  // supplier (এখন আপনি API তে supplier_name পাঠালে এটা সুন্দর দেখাবে)
  if (oldPm.supplier_id !== newPm.supplier_id) {
    summary.push({
      field: "Supplier",
      old: oldPm.supplier_name ?? oldPm.supplier_id,
      new: newPm.supplier_name ?? newPm.supplier_id,
    });
  }

  if (num(oldPm.total) !== num(newPm.total)) {
    summary.push({ field: "Total", old: oldPm.total, new: newPm.total });
  }
  if (num(oldPm.discount) !== num(newPm.discount)) {
    summary.push({ field: "Discount", old: oldPm.discount, new: newPm.discount });
  }
  if (num(oldPm.netpayment) !== num(newPm.netpayment)) {
    summary.push({ field: "Net Payment", old: oldPm.netpayment, new: newPm.netpayment });
  }

  const oldDetails = oldPm.details || [];
  const newDetails = newPm.details || [];

  // product_id ভিত্তিতে তুলনা (detail id বদলালেও সমস্যা হবে না)
  const oldMap = new Map(oldDetails.map((d) => [d.product_id, d]));
  const newMap = new Map(newDetails.map((d) => [d.product_id, d]));

  const productIds = Array.from(new Set([...oldMap.keys(), ...newMap.keys()]));

  const items = productIds
    .map((pid) => {
      const o = oldMap.get(pid);
      const n = newMap.get(pid);

      const oldQty = o?.quantity ?? "";
      const newQty = n?.quantity ?? "";
      const oldPrice = o?.purchase_price ?? "";
      const newPrice = n?.purchase_price ?? "";

      const changed =
        (!o && !!n) ||
        (!!o && !n) ||
        num(oldQty) !== num(newQty) ||
        num(oldPrice) !== num(newPrice);

      return {
        product_id: pid,
        product_name: n?.product_name ?? o?.product_name ?? null, // ✅ backend enrich থাকলে নাম দেখাবে
        old_quantity: oldQty,
        new_quantity: newQty,
        old_price: oldPrice,
        new_price: newPrice,
        changed,
      };
    })
    .filter((r) => r.changed);

  return { summary, items };
};
