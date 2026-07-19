/**
 * Pulls the voucher number out of the API's success text.
 *
 * The transaction endpoints do not return it as a field — they return a
 * sentence, and not even a consistent one: some say "Voucher No. 2-260200001",
 * others "Vr. No. 2-260200001", and updates append " Updated Successfully".
 * Match the number itself rather than the wording, and fall back to the whole
 * string so a new phrasing degrades to showing something instead of nothing.
 */
export const extractVoucherNo = (text?: string): string => {
  if (!text) return '';

  const match = String(text).match(/\b\d+-\d+\b/);
  return match ? match[0] : String(text).trim();
};

export default extractVoucherNo;
