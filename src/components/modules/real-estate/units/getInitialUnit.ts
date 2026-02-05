export const getInitialUnit = (flatId: number) => ({
  flat_id: flatId,
  unit_no: "",
  size_sqft: 0,
  allocated_cost: 0,
  sale_price: null,
  sale_date: null,
  notes: "",
  unit_type: "unit",
  status: 1,
});
