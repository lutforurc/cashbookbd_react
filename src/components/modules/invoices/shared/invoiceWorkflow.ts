/**
 * The two invoice workflows a branch may offer at the same time.
 *
 * One menu entry, one route, one permission -- and behind it two existing
 * screens. Branch Setup -> Forms Setup decides whether the branch uses one of
 * them or both; this file is the vocabulary the two index screens and the
 * report Edit buttons share.
 *
 * ⚠️ THE IDS ARE THE SERVER'S, NOT THE SCREEN'S. `invoice_workflow` is stored
 * on the voucher as exactly these two words, so a report link can ask for the
 * form that wrote the invoice without the browser having to know which React
 * component that is. Do not rename one without a migration for the column.
 */
export type InvoiceWorkflow = 'order' | 'tiles';

export const INVOICE_WORKFLOW_ORDER: InvoiceWorkflow = 'order';
export const INVOICE_WORKFLOW_TILES: InvoiceWorkflow = 'tiles';

/** The words a stored workflow may be, checked rather than trusted. */
export const isInvoiceWorkflow = (value: unknown): value is InvoiceWorkflow =>
  value === INVOICE_WORKFLOW_ORDER || value === INVOICE_WORKFLOW_TILES;

/**
 * Which screen a branch opens when the invoice itself does not say.
 *
 * This is the fallback for invoices written before the column existed, and for
 * a route reached without a workflow. It must keep the resolution those
 * invoices have always had: a Tiles and Sanitary branch opens the Tiles form,
 * every other branch opens the order-driven one. It is deliberately NOT read
 * from invoice_deducts_stock -- an invoice may take its stock now or hold it
 * for a delivery under either workflow, and the two questions are unrelated.
 */
export const invoiceWorkflowForBranch = (
  isTilesAndSanitary: unknown,
): InvoiceWorkflow =>
  isTilesAndSanitary ? INVOICE_WORKFLOW_TILES : INVOICE_WORKFLOW_ORDER;

/**
 * Which of the two workflows the branch's OWN form is -- the one Forms Setup
 * opens with no "Both" and no Edit link. Null when that form is neither of the
 * two (Smart, Partner, General, Classic). "Both" counts as Automatic here.
 */
export const ownInvoiceWorkflow = (
  preferred: string,
  isTilesAndSanitary: unknown,
  inventorySystemId: unknown,
): InvoiceWorkflow | null => {
  if (preferred === 'tiles') return INVOICE_WORKFLOW_TILES;
  if (preferred === 'trading') return INVOICE_WORKFLOW_ORDER;
  if (preferred && preferred !== 'both') return null;
  if (isTilesAndSanitary) return INVOICE_WORKFLOW_TILES;
  return Number(inventorySystemId) === 4 ? INVOICE_WORKFLOW_ORDER : null;
};

/**
 * The query value that pins "the branch's own form" in Both mode, for a legacy
 * invoice opened from a report on a branch whose own form is neither workflow.
 * The edit screens clear their router state once the search has run, so
 * without it the screen would swap to the switch's form mid-edit.
 */
export const INVOICE_WORKFLOW_OWN = 'auto';

export interface InvoiceFormPick {
  /** One of the two workflow forms, or 'own': the branch's own form. */
  form: InvoiceWorkflow | 'own';
  showSwitch: boolean;
}

/**
 * Which form Sales Invoice / Purchase Invoice mounts.
 *
 * - Both: the switch, on the form the link names, else the branch's own
 *   workflow. A legacy invoice (no stored workflow) opened from a report on a
 *   branch whose own form is neither workflow opens that own form -- the one
 *   that wrote it -- with no switch.
 * - Anything else: a link may name one of the two forms ONLY when the branch's
 *   own form is one of them, so an invoice written before the preference moved
 *   between Tiles and Order still reopens where it was written. A Smart,
 *   Partner, General or Classic branch ignores the query and keeps its form.
 */
export const pickInvoiceForm = ({
  preferred,
  requested,
  legacyEdit,
  ownWorkflow,
  isTilesAndSanitary,
}: {
  preferred: string;
  requested: unknown;
  legacyEdit: boolean;
  ownWorkflow: InvoiceWorkflow | null;
  isTilesAndSanitary: unknown;
}): InvoiceFormPick => {
  const named = isInvoiceWorkflow(requested) ? requested : null;

  if (preferred === 'both') {
    if (named) return { form: named, showSwitch: true };
    if (ownWorkflow === null && (legacyEdit || requested === INVOICE_WORKFLOW_OWN)) {
      return { form: 'own', showSwitch: false };
    }
    return {
      form: ownWorkflow ?? invoiceWorkflowForBranch(isTilesAndSanitary),
      showSwitch: true,
    };
  }

  if (named && ownWorkflow !== null) return { form: named, showSwitch: false };

  return { form: 'own', showSwitch: false };
};

/** The workflow a report row carries, or null when it predates the column. */
export const invoiceWorkflowFromRow = (row: any): InvoiceWorkflow | null => {
  const value = row?.invoice_workflow;
  return isInvoiceWorkflow(value) ? value : null;
};

/**
 * The same route with the workflow named in the query string.
 *
 * The query, rather than router state, because the edit screens clear their
 * state once the voucher has been searched for -- and because a link that is
 * copied, bookmarked or printed should still know which form it means.
 */
export const withInvoiceWorkflowQuery = (
  route: string,
  workflow: unknown,
): string => {
  if (!isInvoiceWorkflow(workflow)) return route;

  const separator = route.includes('?') ? '&' : '?';
  return `${route}${separator}workflow=${workflow}`;
};

/** The wording on the switch, as the branch sees it in Forms Setup. */
export const invoiceWorkflowLabel = (workflow: InvoiceWorkflow): string =>
  workflow === INVOICE_WORKFLOW_TILES ? 'Tiles & Sanitary' : 'Order Management';

/** The second line under that wording -- the form's branch-setup name. */
export const invoiceWorkflowVariantLabel = (workflow: InvoiceWorkflow): string =>
  workflow === INVOICE_WORKFLOW_TILES ? 'Elegant' : 'Essential';
