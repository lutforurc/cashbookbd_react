/**
 * The description cell of the Cash Book and the Bank Book.
 *
 * The report used to hand these screens a fragment of markup -- the party name
 * in a span, a break, then the account name -- which the screens gave straight
 * to the browser. Escaping every piece as it went in kept a ledger named with
 * an angle bracket from running as script, but building markup was never the
 * report query's job. So the API now sends the two names as they are, and the
 * screens draw them.
 *
 * `nam` is still sent, and is still that fragment. Nothing here reads it except
 * the fallback below, which exists for the moment between one repository being
 * deployed and the other: an older API sends no party_name or account_name, and
 * an unrecognised tag on screen is worse than a stripped one.
 */
export type ReportDescription = {
  party: string;
  account: string;
};

/**
 * Tags out, entities back to their characters. Never inserted as markup.
 *
 * By hand rather than through the browser's parser: the fallback runs once per
 * row per render, and a report of five hundred lines would be parsing five
 * hundred documents to read five hundred names. The five entities below are
 * all Laravel's e() emits, which is all this string has ever been through.
 */
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#039;': "'",
};

const asPlainText = (value: string): string =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:amp|lt|gt|quot|#039);/g, (entity) => ENTITIES[entity] ?? entity)
    .replace(/\s+/g, ' ')
    .trim();

export const reportDescription = (row: any): ReportDescription => {
  const account = row?.account_name;
  const party = row?.party_name;

  if (account !== undefined && account !== null) {
    return { party: String(party || ''), account: String(account) };
  }

  // An API that predates the split. The party name and the account name are
  // one string there, and the break between them is the only thing that says
  // where one ends -- so the whole of it goes in the account line.
  return { party: '', account: asPlainText(String(row?.nam || '')) };
};
