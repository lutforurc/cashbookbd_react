const SIGN_IN_TITLES: Record<string, string> = {
  "accounts.nibirnirman.cashbookbd.com": "Sign In to Nibir Nirman",
  "accounts.sinthia.cashbookbd.com": "Sign In to Sinthia Electronics",
  "accounts.eworld.cashbookbd.com": "Sign In to ISLAMIA DISTRIBUTION",
  "accounts.gme.cashbookbd.com": "Sign In to GM Enterprise",
  "accounts.krf.cashbookbd.com": "Sign In to KRF",
  "accounts.scn.cashbookbd.com": "Sign In to Soy Cyber Net",
  "accounts.kps.cashbookbd.com": "Sign In to KPS",
  "accounts.mbdpp.cashbookbd.com": "Sign In to Ma Babar Dowa",
  "accounts.rmr.cashbookbd.com": "Sign In to RMR Multi Mobile",
};

export const getSignInTitleByHost = (hostname: string): string => {
  return SIGN_IN_TITLES[hostname] ?? "Sign In to Cashbook";
};

