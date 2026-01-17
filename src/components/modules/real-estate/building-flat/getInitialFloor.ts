import { FlatItem } from "./types";


export const getInitialFlat = (
  buildingId?: string | number
): FlatItem => ({
  building_id: buildingId ? Number(buildingId) : null,

  floor_no: 0,
  flat_no: "",

  total_units: 1,

  allocated_cost: 0,

  sale_price: null,
  sale_date: null,

  status: 1,
  notes: "",
});
