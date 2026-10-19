import React from 'react';
import { FiLogIn } from 'react-icons/fi';
import { ButtonLoading } from '../UiElements/CustomButtons';

/**
 * The one hostname whose sign-in page carries the public demo credentials.
 *
 * ⚠️ MATCHED BY EXACT EQUALITY, never by suffix or substring. A
 * `endsWith('staging.cashbookbd.com')` or `includes('cashbookbd')` test would
 * light this table up on production, on localhost, and on every tenant
 * subdomain under accounts.*.cashbookbd.com -- none of which should publish a
 * set of working logins.
 */
export const DEMO_ACCOUNTS_HOSTNAME = 'accounts.staging.cashbookbd.com';

/** One demo business a visitor may sign in as. */
export interface DemoLoginAccount {
  /** What the business trades in. Shown to the visitor, one row per type. */
  businessType: string;
  /** The sign-in id; fills the email-or-phone field. */
  loginId: string;
  /**
   * The password, shown in full on purpose. These are demo logins meant to be
   * published, and a visitor cannot try one without reading it.
   */
  password: string;
}

/**
 * The demo businesses on offer.
 *
 * A list rather than a single row, so adding another business type is another
 * entry here and nothing else -- the table renders whatever is in it.
 *
 * ⚠️ These are the credentials of accounts that already exist on the demo
 * branch. Rendering this table creates, changes and grants nothing; the
 * account behind each entry has to be provisioned separately, scoped to its own
 * demo business/branch and without administrative rights.
 */
export const DEMO_LOGIN_ACCOUNTS: DemoLoginAccount[] = [
  {
    businessType: 'Rod, Cement, Bricks',
    loginId: 'rodcement@gmail.com',
    password: 'rodcement@gmail.com',
  },
];

/** Whether this hostname is the one whose sign-in page shows the demo logins. */
export const shouldShowDemoLoginAccounts = (hostname: string): boolean =>
  hostname === DEMO_ACCOUNTS_HOSTNAME;

interface DemoLoginAccountsProps {
  /**
   * Fills the sign-in form with the chosen account. Deliberately does not
   * submit it -- the visitor reviews, then presses Sign In.
   */
  onUseLogin: (loginId: string, password: string) => void;
}

/**
 * The demo credentials table on the staging sign-in page.
 *
 * Renders nothing at all on any other hostname, so the check is the first thing
 * this does and there is no half-built table waiting behind a CSS class.
 *
 * The look is the sign-in card's own -- the same border, surface and radius --
 * so it reads as part of the page rather than a panel bolted under it. The grid
 * follows the app's table language: the header takes --c-table-head and the
 * body --c-table-body, ruled in --c-border.
 */
const DemoLoginAccounts: React.FC<DemoLoginAccountsProps> = ({ onUseLogin }) => {
  if (!shouldShowDemoLoginAccounts(window.location.hostname)) return null;

  const cell = 'border border-[rgb(var(--c-border))] px-2 py-1.5 sm:px-3 sm:py-2 align-middle';

  return (
    <div className="mt-6 rounded-xl border border-[rgb(var(--c-border))] bg-[rgb(var(--c-surface))] p-4 shadow-default sm:p-6">
      <h3 className="text-sm font-semibold text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))]">
        Demo Login Accounts
      </h3>
      <p className="mt-1 text-xs text-[rgb(var(--c-text-muted))] dark:text-[rgb(var(--c-text-muted))]">
        Pick a demo account below to fill the form, then press Sign In.
      </p>

      {/* The card is narrow, so the grid scrolls sideways rather than crushing
          its columns on a phone. */}
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-xs text-[rgb(var(--c-text))] dark:text-[rgb(var(--c-text))] sm:text-sm">
          <thead className="bg-[rgb(var(--c-table-head))] text-[11px] uppercase sm:text-xs">
            <tr>
              <th className={`whitespace-nowrap font-semibold ${cell}`}>Sl. No.</th>
              <th className={`font-semibold ${cell}`}>Business Type</th>
              <th className={`whitespace-nowrap font-semibold ${cell}`}>User</th>
              <th className={`whitespace-nowrap font-semibold ${cell}`}>Password</th>
              <th className={`whitespace-nowrap font-semibold ${cell}`}>Action</th>
            </tr>
          </thead>
          <tbody className="bg-[rgb(var(--c-table-body))]">
            {DEMO_LOGIN_ACCOUNTS.map((account, index) => (
              <tr key={account.loginId}>
                <td className={cell}>{index + 1}</td>
                <td className={cell}>{account.businessType}</td>
                <td className={`whitespace-nowrap ${cell}`}>{account.loginId}</td>
                <td className={`whitespace-nowrap ${cell}`}>
                  <span className="font-mono">{account.password}</span>
                </td>
                <td className={`whitespace-nowrap ${cell}`}>
                  <ButtonLoading
                    type="button"
                    label="Use Login"
                    size="sm"
                    variant="primary"
                    icon={<FiLogIn className="h-4 w-4" />}
                    title={`Fill the form with the ${account.businessType} demo account`}
                    onClick={() => onUseLogin(account.loginId, account.password)}
                    className="whitespace-nowrap"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DemoLoginAccounts;
