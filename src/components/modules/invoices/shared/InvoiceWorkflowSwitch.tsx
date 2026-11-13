import { TabButton } from '../../../../pages/UiElements/CustomButtons';
import {
  INVOICE_WORKFLOW_ORDER,
  INVOICE_WORKFLOW_TILES,
  invoiceWorkflowLabel,
  invoiceWorkflowVariantLabel,
  type InvoiceWorkflow,
} from './invoiceWorkflow';

interface InvoiceWorkflowSwitchProps {
  value: InvoiceWorkflow;
  onChange: (workflow: InvoiceWorkflow) => void;
}

const WORKFLOWS: InvoiceWorkflow[] = [
  INVOICE_WORKFLOW_ORDER,
  INVOICE_WORKFLOW_TILES,
];

/**
 * The picker at the top of Sales Invoice and Purchase Invoice when Branch
 * Setup -> Forms Setup is set to "Both".
 *
 * The two buttons are the two existing screens, unchanged: choosing one mounts
 * the form that was always there. Nothing about either form is reimplemented
 * here, and switching is a fresh invoice -- the same thing the Reset button
 * does -- because an order invoice and a tiles invoice collect different
 * fields and there is no honest way to carry a half-written one across.
 *
 * Not shown at all unless the branch chose Both: with a single workflow the
 * screen opens that form directly, exactly as it did before Both existed.
 */
const InvoiceWorkflowSwitch = ({ value, onChange }: InvoiceWorkflowSwitchProps) => (
  <div className="mb-3 flex flex-wrap items-center gap-3 rounded-sm border border-stroke bg-white px-4 py-3 dark:border-strokedark dark:bg-boxdark">
    <span className="text-xs font-semibold uppercase tracking-wide text-bodydark2">
      Invoice Form
    </span>

    <div role="group" aria-label="Invoice workflow" className="inline-flex gap-1">
      {WORKFLOWS.map((workflow) => (
        <TabButton
          key={workflow}
          active={value === workflow}
          onClick={() => {
            if (value !== workflow) onChange(workflow);
          }}
          label={
            <span className="flex flex-col items-start leading-tight">
              <span>{invoiceWorkflowLabel(workflow)}</span>
              <span className="text-[0.65rem] font-normal opacity-80">
                {invoiceWorkflowVariantLabel(workflow)}
              </span>
            </span>
          }
        />
      ))}
    </div>

    <span className="text-xs text-bodydark2">
      Switching starts a new invoice. Edit an existing one from its report.
    </span>
  </div>
);

export default InvoiceWorkflowSwitch;
