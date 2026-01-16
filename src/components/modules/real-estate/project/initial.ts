// initial.ts

import { ProjectItem } from "./types";

 

export const getInitialProject = (
  areaId?: string | number
): ProjectItem => ({
  company_id: '',
  branch_id: '',
  area_id: areaId || '',
  customer_id: null,

  name: '',
  location_details: '',
  area_sqft: '',
  purchase_price: '',
  purchase_date: '',
  sale_price: '',
  sale_date: '',

  notes: '',
  status: '1',
});
