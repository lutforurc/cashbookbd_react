import { API_CHART_OF_ACCOUNTS_DDL_L4_URL } from '../../services/apiRoutes';
import { getToken } from '../../../features/authReducer';

/**
 * The party an order was raised for, ready to drop into an account field.
 *
 * Picking an order on the purchase invoice fills the supplier in; the cash
 * payment and cash received screens left the account empty and made the
 * operator pick the same party again, from memory, next to the order number
 * that already says who it is.
 *
 * The order search sends `party_id` alongside the name, so almost always this
 * is a read of two fields. The lookup below is for the orders that have a name
 * and no id.
 */
export interface OrderParty {
  /** Chart-of-accounts id, or '' when only a name could be established. */
  id: string | number;
  /** The party's name as the order records it. */
  name: string;
}

/**
 * Names are matched exactly, and a near miss resolves to no id at all.
 *
 * The ledger search matches substrings, so "Trade Link" also finds "N S Trade
 * Link". On the purchase screen the first hit is taken; here it is not. An
 * account on a cash voucher is who the money moved to, and an operator who
 * sees the field still empty picks the right one -- where a plausible wrong
 * name sitting in the box is something nobody re-reads.
 */
const findExactMatch = (options: any[], name: string) => {
  const wanted = name.trim().toLowerCase();

  return (
    options.find(
      (item: any) => String(item?.label ?? '').trim().toLowerCase() === wanted,
    ) ?? null
  );
};

export const resolveOrderParty = async (option: any): Promise<OrderParty> => {
  const name = String(option?.label_2 ?? '').trim();

  // party_id is what the order search sends; the rest are older shapes the
  // purchase screen still reads, kept so one order payload serves them all.
  const id =
    option?.party_id ??
    option?.supplier_id ??
    option?.order_for_id ??
    option?.account_id ??
    '';

  if (id) {
    return { id, name };
  }

  if (!name) {
    return { id: '', name: '' };
  }

  try {
    const response = await fetch(
      // No acType: both cash screens offer every kind of account, so the
      // search that fills the field has to look as wide as the field does.
      `${API_CHART_OF_ACCOUNTS_DDL_L4_URL}?searchName=${encodeURIComponent(name)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );

    const body = await response.json();
    const options = body?.data?.data;
    const matched = Array.isArray(options) ? findExactMatch(options, name) : null;

    if (matched) {
      return { id: matched?.value ?? '', name: matched?.label ?? name };
    }
  } catch (error) {
    console.error('Could not resolve the party on this order:', error);
  }

  // The name still goes back, so the caller can show who the order is for
  // even when it could not put an id behind it.
  return { id: '', name };
};

export default resolveOrderParty;
