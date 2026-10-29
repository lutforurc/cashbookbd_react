/**
 * Reading a Product List response, whichever way the list answered.
 *
 * ⚠️ THE PAYLOAD IS NESTED TWICE, AND THEN DIFFERS BY MODE. foundData() answers
 * { success, data: { data: <payload>, transaction_date } }, and <payload> is:
 *
 *   paged          — the paginator: { current_page, data: [rows], … }
 *   "show all"     — { data: [ { category, items: [rows] }, … ], meta }
 *
 * Reading one level short hands the flattener an object and it quietly returns
 * nothing — which is exactly what "No products to export." came from. Both
 * readers below take the whole HTTP body, so callers cannot get the depth wrong.
 */

/** The rows of a payload that may be a page of rows or grouping wrappers. */
export const flattenProductPayload = (payload: any): any[] => {
  // ✅ flat paginate response
  if (Array.isArray(payload) && payload.length > 0 && !payload[0]?.items) {
    return payload;
  }

  // ✅ grouped showAll response: [{category, items:[]}, ...]
  if (Array.isArray(payload) && payload.length > 0 && Array.isArray(payload[0]?.items)) {
    const flat: any[] = [];
    payload.forEach((group: any) => {
      if (Array.isArray(group.items)) flat.push(...group.items);
    });
    return flat;
  }

  return [];
};

/**
 * The products inside a Product List HTTP body (`response.data`).
 *
 * The Redux slice stores the same object this reads (`_data.data.data`), so the
 * Excel export and the table walk the response by one rule.
 */
export const productListFromResponse = (body: any): any[] => {
  const payload = body?.data?.data;

  // <payload>.data is the array in both modes: the paginator's rows, or the
  // category groups. A server that answered with a bare array is taken as is.
  return flattenProductPayload(payload?.data ?? payload);
};
