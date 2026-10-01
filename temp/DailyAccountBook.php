<?php

namespace App\Services\Reports;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The Daily Account Book: one day's cash book, read down two sides.
 *
 * The paper the desk keeps by the till. Receipts down the left and payments
 * down the right, each cut into the kinds of voucher that actually moved the
 * till, each footed, and the whole closed with
 *
 *      Closing = Opening + Total Receipt - Total Payment
 *
 * ⚠️ CASH ONLY. The bank and the mobile wallets are reported BESIDE this book,
 * as balances at the close of the day, and never inside its two sides. A
 * receipt banked is already counted where it came in, and adding the bank's own
 * movement on top would count the same taka twice -- and would stop the closing
 * figure agreeing with the till, which is the one thing this page is read for.
 *
 * ⚠️ THE SECTION IS DECIDED BY THE ACCOUNT ON THE OTHER SIDE OF THE MONEY, not
 * by the voucher number. Two thousand taka out of the till is an expense, a
 * supplier being paid or a customer being refunded, and only the counter-head
 * can say which. The prefix is asked for the one thing a head cannot answer --
 * whether a sale was invoiced at the counter or settled afterwards -- and for
 * nothing else.
 *
 * ⚠️ TWO SECTIONS ARE MEMORANDA AND CARRY NO MONEY. Today Due Sales and Today
 * Due Purchase are the day's credit business: no cash moved, so they cannot
 * enter either total, and adding them would break the closing figure by exactly
 * the credit sales of the day. They are printed because the desk wants the day
 * seen whole, and they are footed in their own right.
 */
class DailyAccountBook
{
    /** acc_coa_level3s: what makes a leg the till, the bank, a wallet. */
    private const CASH_GROUP = 1;
    private const BANK_GROUP = 2;
    private const MOBILE_GROUP = 28;

    /** acc_coa_level3s id 9 is Purchase -- the trading head, not an expense. */
    private const PURCHASE_COA3 = 9;

    /** acc_coa_level1s: id 3 Income, id 4 Expense. */
    private const INCOME_LEVEL1 = 3;
    private const EXPENSE_LEVEL1 = 4;

    /** cust_party_types: what each party kind means. */
    private const PARTY_TYPE_CUSTOMER = 1;
    private const PARTY_TYPE_SUPPLIER = 2;

    /** main_trx_master.voucher_type -- the acc_vr_type prefix. */
    private const VR_SALES_INVOICE    = 3;
    private const VR_JOURNAL          = 5;
    private const VR_CREDIT_PURCHASE  = 9;
    private const VR_CREDIT_SALES     = 10;
    private const VR_PURCHASE_RETURN  = 12;
    private const VR_SALES_RETURN     = 13;

    /**
     * The two sides, in the order the paper prints them.
     *
     * `in_total` is false for the two memoranda only -- see the note on the
     * class. Everything else on a side is money that moved.
     */
    private const SIDES = [
        'receipt' => [
            ['key' => 'cash_sales',             'title' => 'CASH SALES',                     'in_total' => true],
            ['key' => 'received_from_customer', 'title' => 'RECEIVED PAYMENT FROM CUSTOMER', 'in_total' => true],
            ['key' => 'received_from_supplier', 'title' => 'RECEIVED FROM SUPPLIER',         'in_total' => true],
            ['key' => 'contra_debit',           'title' => 'CASH DEBIT BY CONTRA VOUCHER',   'in_total' => true],
            ['key' => 'journal_debit',          'title' => 'CASH DEBIT BY JOURNAL VOUCHER',  'in_total' => true],
            ['key' => 'others_income',          'title' => 'OTHERS INCOME',                  'in_total' => true],
        ],
        'payment' => [
            ['key' => 'cash_purchase',          'title' => 'CASH PURCHASE',                  'in_total' => true],
            ['key' => 'payment_to_supplier',    'title' => 'PAYMENT TO SUPPLIER',            'in_total' => true],
            ['key' => 'payment_to_customer',    'title' => 'PAYMENT TO CUSTOMER',            'in_total' => true],
            ['key' => 'contra_credit',          'title' => 'CASH CREDIT BY CONTRA VOUCHER',  'in_total' => true],
            ['key' => 'journal_credit',         'title' => 'CASH CREDIT BY JOURNAL VOUCHER', 'in_total' => true],
            ['key' => 'expenses',               'title' => 'EXPENSES',                       'in_total' => true],
            ['key' => 'due_sales',              'title' => 'TODAY DUE SALES',                'in_total' => false],
            ['key' => 'due_purchase',           'title' => 'TODAY DUE PURCHASE',             'in_total' => false],
            ['key' => 'sales_return',           'title' => 'SALES RETURN',                   'in_total' => true],
        ],
    ];

    public function report(int $companyId, int $branchId, string $from, string $to, ?int $cashAccountId = null): array
    {
        $scope = $this->chartScope();

        $opening = $this->opening($companyId, $branchId, $from, $cashAccountId);
        $rows    = $this->rows($companyId, $branchId, $from, $to, $scope, $cashAccountId);

        $sections = $this->sections($rows);

        $receiptTotal = $this->sideTotal($sections['receipt'] ?? []);
        $paymentTotal = $this->sideTotal($sections['payment'] ?? []);

        // ⚠️ The one arithmetic the page exists to state. Cash only, and the
        // memoranda left out of it -- see the note on the class.
        $closing = round($opening + $receiptTotal - $paymentTotal, 2);

        return [
            'from'    => $from,
            'to'      => $to,
            'opening' => $opening,
            'sections' => $sections,
            'totals'  => [
                'receipt' => $receiptTotal,
                'payment' => $paymentTotal,
            ],
            'closing' => $closing,
            'banks'   => $this->balances($companyId, $to, self::BANK_GROUP),
            'mobiles' => $this->balances($companyId, $to, self::MOBILE_GROUP),
            'closing_receivable' => $this->partyBalance($companyId, $scope['customer'], $to, true),
            'closing_payable'    => $this->partyBalance($companyId, $scope['supplier'], $to, false),
            'cash_accounts'      => $this->cashAccounts($companyId),
        ];
    }

    /**
     * What the till stood at before the first day shown.
     *
     * Every posting to a cash head up to that date, not the receipts of some
     * voucher type -- a balance that ignored a journal entry would be a balance
     * that does not match the ledger, and this figure is held against the Cash
     * Book and the Ledger the same afternoon.
     */
    private function opening(int $companyId, int $branchId, string $from, ?int $cashAccountId): float
    {
        $sum = $this->cashLegs($companyId, $branchId, $cashAccountId)
            ->where('mtm.vr_date', '<', $from)
            ->selectRaw('COALESCE(SUM(atd.debit) - SUM(atd.credit), 0) as balance')
            ->value('balance');

        return round((float) $sum, 2);
    }

    /**
     * One row per voucher the day book should show, on the side the till moved.
     */
    private function rows(
        int $companyId,
        int $branchId,
        string $from,
        string $to,
        array $scope,
        ?int $cashAccountId,
    ): array {
        $ids = $this->voucherIds($companyId, $branchId, $from, $to, $cashAccountId);

        if (!$ids) {
            return [];
        }

        $vouchers = $this->foldLegs($this->allLegs($ids), $scope);

        $rows = [];

        foreach ($vouchers as $voucher) {
            $place = $this->sectionOf($voucher);

            if ($place === null) {
                continue;
            }

            $rows[] = [
                'mtm_id'          => $voucher['mtm_id'],
                'vr_no'           => $voucher['vr_no'],
                'vr_date'         => $voucher['vr_date'],
                'is_approved'     => $voucher['is_approved'],
                'approved_by'     => $voucher['approved_by'],
                'combined_number' => $voucher['combined_number'],
                'section'         => $place['section'],
                'amount'          => $place['amount'],
                'description'     => $this->description($voucher),
            ];
        }

        usort($rows, fn ($a, $b) => [$a['vr_date'], $a['mtm_id']] <=> [$b['vr_date'], $b['mtm_id']]);

        // ⚠️ The serial is the section's own, counted here rather than on the
        // screen: a page numbered by whoever is looking at it numbers the same
        // book differently in print and on the glass.
        $serials = [];

        foreach ($rows as $index => $row) {
            $serials[$row['section']] = ($serials[$row['section']] ?? 0) + 1;
            $rows[$index]['sl'] = $serials[$row['section']];
        }

        return $rows;
    }

    /**
     * Which vouchers the day book is made of.
     *
     * ⚠️ THE CREDIT VOUCHERS ARE ASKED FOR BY NAME. Today Due Sales and Today
     * Due Purchase are memoranda of business that moved NO cash, so a set built
     * only from the vouchers that touched the till would leave both sections
     * empty every day of the year -- and the page would look right, which is
     * the worst way for it to be wrong.
     */
    private function voucherIds(int $companyId, int $branchId, string $from, string $to, ?int $cashAccountId): array
    {
        $cash = $this->cashLegs($companyId, $branchId, $cashAccountId)
            ->whereBetween('mtm.vr_date', [$from, $to])
            ->distinct()
            ->pluck('mtm.id')
            ->all();

        $credit = DB::table('main_trx_master as mtm')
            ->where('mtm.status', 1)
            ->where('mtm.company_id', $companyId)
            ->where('mtm.branch_id', $branchId)
            ->whereBetween('mtm.vr_date', [$from, $to])
            ->whereIn('mtm.voucher_type', [self::VR_CREDIT_SALES, self::VR_CREDIT_PURCHASE])
            ->pluck('mtm.id')
            ->all();

        return array_values(array_unique(array_map('intval', array_merge($cash, $credit))));
    }

    /**
     * Every leg of the vouchers in hand, folded into one record each.
     *
     * One query for the whole day rather than one per voucher: a day is a few
     * hundred vouchers and a query each would put a page of reading behind a
     * second of waiting.
     */
    private function foldLegs($legs, array $scope): array
    {
        $vouchers = [];
        $perTransaction = [];

        foreach ($legs as $leg) {
            $id = (int) $leg->mtm_id;

            $vouchers[$id] ??= [
                'mtm_id'            => $id,
                'vr_no'             => $leg->vr_no,
                'vr_date'           => $leg->vr_date,
                'voucher_type'      => (int) $leg->voucher_type,
                'is_approved'       => (int) $leg->is_approved,
                'approved_by'       => $leg->approved_by,
                'combined_number'   => $leg->combined_number,
                'manual_voucher_no' => trim((string) ($leg->manual_voucher_no ?? '')),
                'cash_in'   => 0.0,
                'cash_out'  => 0.0,
                'has_other' => false,
                'party'     => null,
                'expense'   => false,
                'income'    => false,
                'purchase'  => false,
                'names'     => [],
                'value'     => 0.0,
            ];

            // Each transaction's own debit, kept apart so the voucher's value
            // can be the LARGEST of them rather than their sum -- see the note
            // on value below.
            $perTransaction[$id][(int) $leg->atm_id] =
                ($perTransaction[$id][(int) $leg->atm_id] ?? 0.0) + (float) $leg->debit;

            $group = (int) $leg->grp;

            if ($group === self::CASH_GROUP) {
                $vouchers[$id]['cash_in']  = round($vouchers[$id]['cash_in'] + (float) $leg->debit, 2);
                $vouchers[$id]['cash_out'] = round($vouchers[$id]['cash_out'] + (float) $leg->credit, 2);
                continue;
            }

            // Any leg that is not the till itself is the other side of the
            // money, and it is what names the section.
            $vouchers[$id]['has_other'] = true;
            $vouchers[$id]['names'][$leg->head_name] = $leg->head_name;

            if (isset($scope['parties'][$group])) {
                $vouchers[$id]['party'] = $scope['parties'][$group];
            }

            if ($group === self::PURCHASE_COA3) {
                $vouchers[$id]['purchase'] = true;
            } elseif (isset($scope['expense'][$group])) {
                $vouchers[$id]['expense'] = true;
            } elseif (isset($scope['income'][$group])) {
                $vouchers[$id]['income'] = true;
            }
        }

        foreach ($vouchers as $id => $voucher) {
            // ⚠️ THE VOUCHER'S VALUE IS ITS LARGEST TRANSACTION, NOT THE SUM OF
            // ITS ENTRIES. A sale paid at the counter is written as two entries
            // under one voucher -- the invoice and the receipt -- and adding
            // every debit up said a 1,000 sale with 400 in cash was worth 1,400.
            // The invoice is the larger of the two, and the settling entry can
            // never exceed what it settles, so the largest entry IS the value.
            $vouchers[$id]['value'] = round(max($perTransaction[$id] ?? [0.0]), 2);
        }

        return array_values($vouchers);
    }

    /**
     * Which section a voucher belongs to, and for how much.
     */
    private function sectionOf(array $voucher): ?array
    {
        $type = $voucher['voucher_type'];

        // ⚠️ THE MEMORANDA FIRST, because they have no cash on them at all and
        // every test below is a test about cash. A credit sale that fell
        // through to them would be dropped rather than mis-filed, and a section
        // that is always empty looks like a quiet day.
        if ($type === self::VR_CREDIT_SALES) {
            return ['section' => 'due_sales', 'amount' => $voucher['value']];
        }

        if ($type === self::VR_CREDIT_PURCHASE) {
            return ['section' => 'due_purchase', 'amount' => $voucher['value']];
        }

        $in  = $voucher['cash_in'] > 0;
        $out = $voucher['cash_out'] > 0;

        if (!$in && !$out) {
            return null;
        }

        // A voucher with nothing but cash legs is a contra: money moved between
        // the till and a bank, and no third account was touched.
        if (!$voucher['has_other']) {
            return $in
                ? ['section' => 'contra_debit', 'amount' => $voucher['cash_in']]
                : ['section' => 'contra_credit', 'amount' => $voucher['cash_out']];
        }

        // A sale returned for cash over the counter: the money goes back out of
        // the till. Prefix 13 is the sales return.
        if ($type === self::VR_SALES_RETURN && $out) {
            return ['section' => 'sales_return', 'amount' => $voucher['cash_out']];
        }

        if ($voucher['party'] !== null) {
            $isCustomer = $voucher['party'] === 'customer';

            if ($in) {
                // ⚠️ An invoiced sale against a customer's own head is a cash
                // sale; the same head on a receipt voucher is the customer
                // settling what was already owed. Nothing but the prefix can
                // separate the two, which is the one place it is asked.
                return $type === self::VR_SALES_INVOICE
                    ? ['section' => 'cash_sales', 'amount' => $voucher['cash_in']]
                    : ['section' => $isCustomer ? 'received_from_customer' : 'received_from_supplier', 'amount' => $voucher['cash_in']];
            }

            return ['section' => $isCustomer ? 'payment_to_customer' : 'payment_to_supplier', 'amount' => $voucher['cash_out']];
        }

        if ($voucher['purchase']) {
            return $out
                ? ['section' => 'cash_purchase', 'amount' => $voucher['cash_out']]
                : ['section' => 'others_income', 'amount' => $voucher['cash_in']];
        }

        if ($voucher['expense']) {
            // An expense head debited with the till credited is an expense
            // paid. The same head on the other side -- a refund, a correction
            // -- is money coming back, and is not spending.
            return $out
                ? ['section' => 'expenses', 'amount' => $voucher['cash_out']]
                : ['section' => 'others_income', 'amount' => $voucher['cash_in']];
        }

        if ($voucher['income']) {
            return $in
                ? ['section' => 'others_income', 'amount' => $voucher['cash_in']]
                : ['section' => 'expenses', 'amount' => $voucher['cash_out']];
        }

        // Nothing recognisable on the other side: a journal that moved cash
        // against a head this report has no bucket for. It goes where the
        // reader expects an unexplained entry.
        return $in
            ? ['section' => 'journal_debit', 'amount' => $voucher['cash_in']]
            : ['section' => 'journal_credit', 'amount' => $voucher['cash_out']];
    }

    /**
     * The section rows, each with its own footing, in the paper's order.
     *
     * Every section is returned whether or not it has lines: the paper prints
     * all fifteen with a Total of 0.00 against the empty ones, and a report that
     * dropped them would renumber itself from one day to the next.
     */
    private function sections(array $rows): array
    {
        $sections = [];

        foreach (self::SIDES as $side => $definitions) {
            $sections[$side] = [];

            foreach ($definitions as $definition) {
                $mine  = array_values(array_filter($rows, fn ($row) => $row['section'] === $definition['key']));
                $total = 0.0;

                foreach ($mine as $row) {
                    $total = round($total + $row['amount'], 2);
                }

                $sections[$side][] = [
                    'key'      => $definition['key'],
                    'title'    => $definition['title'],
                    'in_total' => $definition['in_total'],
                    'rows'     => $mine,
                    'total'    => $total,
                ];
            }
        }

        return $sections;
    }

    private function sideTotal(array $sections): float
    {
        $total = 0.0;

        foreach ($sections as $section) {
            if ($section['in_total']) {
                $total = round($total + $section['total'], 2);
            }
        }

        return $total;
    }

    /**
     * What the row reads as, in the desk's own shorthand.
     *
     * "Cus: Chan Miya" -- the counter account first, because that is the name
     * the reader is looking for, then the number the voucher carries.
     */
    private function description(array $voucher): string
    {
        $names = array_values($voucher['names'] ?? []);

        $head = $voucher['party'] === 'customer'
            ? 'Cus'
            : ($voucher['party'] === 'supplier' ? 'Sup' : null);

        $said = $head ? $head . ': ' . implode(', ', array_slice($names, 0, 3)) : implode(', ', $names);

        if ($voucher['vr_no'] !== '' && $head !== null) {
            $said .= ', ' . $voucher['vr_no'];
        }

        if ($voucher['manual_voucher_no'] !== '') {
            $said .= ' (' . $voucher['manual_voucher_no'] . ')';
        }

        return trim($said);
    }

    /**
     * The heads the section rules ask about, resolved once per request.
     *
     * The parties come from cust_party_types rather than from ids written here,
     * the same way the rest of the application names a customer: a company that
     * adds a second customer head gets it classified without a line changing.
     */
    private function chartScope(): array
    {
        $customer = [];
        $supplier = [];

        // ⚠️ BY PARTY TYPE, NOT BY "ANYTHING THAT IS NOT 1". cust_party_types
        // maps two rows onto the customer head -- "Customer" (1) and
        // "Supplier & Customer" (3) -- so a rule that called everything but 1 a
        // supplier would leave coa3 3 labelled by whichever row came last, and
        // file a customer's name under a supplier's section on the day it lost
        // that race. "Advance" (4) is neither: money held against nothing yet,
        // and it falls through to the journal sections rather than being
        // guessed at.
        foreach ($this->partyTypes() as $type) {
            $coa3 = (int) $type->coa3_id;

            if ((int) $type->id === self::PARTY_TYPE_CUSTOMER) {
                $customer[$coa3] = true;
            } elseif ((int) $type->id === self::PARTY_TYPE_SUPPLIER) {
                $supplier[$coa3] = true;
            }
        }

        $parties = [];

        foreach ($customer as $coa3 => $_) {
            $parties[$coa3] = 'customer';
        }

        foreach ($supplier as $coa3 => $_) {
            $parties[$coa3] ??= 'supplier';
        }

        return [
            'parties'  => $parties,
            'expense'  => array_flip($this->coa3UnderLevel1(self::EXPENSE_LEVEL1)),
            'income'   => array_flip($this->coa3UnderLevel1(self::INCOME_LEVEL1)),
            'customer' => array_keys($customer),
            'supplier' => array_keys($supplier),
        ];
    }

    private function partyTypes()
    {
        if (!Schema::hasTable('cust_party_types')) {
            return collect();
        }

        // Compared as the string '1': status is enum('0','1'), and an ENUM
        // against a number is compared by INDEX, so `= 1` would select exactly
        // the inactive rows.
        return DB::table('cust_party_types')->where('status', '1')->get(['id', 'coa3_id']);
    }

    /** @return int[] */
    private function coa3UnderLevel1(int $level1Id): array
    {
        return DB::table('acc_coa_level3s as l3')
            ->join('acc_coa_level2s as l2', 'l2.id', '=', 'l3.acc_coa_level2_id')
            ->join('acc_coa_level1s as l1', 'l1.id', '=', 'l2.acc_coa_level1_id')
            ->where('l1.id', $level1Id)
            ->pluck('l3.id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * The bank or wallet accounts this company keeps, with what each stands at
     * on the closing day.
     */
    private function balances(int $companyId, string $to, int $group): array
    {
        $rows = DB::table('acc_coa_level4s as acl4')
            ->where('acl4.company_id', $companyId)
            ->where('acl4.acc_coa_level3_id', $group)
            ->orderBy('acl4.name')
            ->get(['acl4.id', 'acl4.name', 'acl4.sku_code']);

        $serial = 1;
        $total  = 0.0;
        $out    = [];

        foreach ($rows as $row) {
            $balance = $this->balanceOf($companyId, (int) $row->id, $to);

            $total = round($total + $balance, 2);

            $out[] = [
                'sl'             => $serial++,
                'name'           => $row->name,
                // ⚠️ Where the chart keeps no number the column says "Nil"
                // rather than going blank: an empty cell reads as a row that
                // failed to load.
                'account_number' => trim((string) $row->sku_code) ?: 'Nil',
                'details'        => '',
                'balance'        => $balance,
            ];
        }

        return ['rows' => $out, 'total' => $total];
    }

    private function balanceOf(int $companyId, int $coa4Id, string $to): float
    {
        $sum = DB::table('acc_transaction_details as atd')
            ->join('acc_transaction_master as atm', 'atm.id', '=', 'atd.trx_mstr_id')
            ->join('main_trx_master as mtm', 'mtm.id', '=', 'atm.main_trx_id')
            ->where('atd.coa4_id', $coa4Id)
            ->where('mtm.company_id', $companyId)
            ->where('mtm.status', 1)
            ->where('mtm.vr_date', '<=', $to)
            ->selectRaw('COALESCE(SUM(atd.debit) - SUM(atd.credit), 0) as balance')
            ->value('balance');

        return round((float) $sum, 2);
    }

    /**
     * What is owed to us, or by us, on the party heads.
     *
     * ⚠️ ONLY THE HEADS THAT ARE ON THE SIDE THEIR OWN MEANING CALLS FOR, which
     * is the rule the due list ages by: a customer in credit has paid ahead and
     * is not money to chase, so it never enters the receivable -- and the same
     * the other way round for a supplier we have overpaid. Read per head rather
     * than over the set, so one party's advance cannot silently cancel another
     * party's bill and print a figure that is neither.
     */
    private function partyBalance(int $companyId, array $coa3Ids, string $to, bool $debitSide): float
    {
        if (!$coa3Ids) {
            return 0.0;
        }

        $rows = DB::table('acc_transaction_details as atd')
            ->join('acc_transaction_master as atm', 'atm.id', '=', 'atd.trx_mstr_id')
            ->join('main_trx_master as mtm', 'mtm.id', '=', 'atm.main_trx_id')
            ->join('acc_coa_level4s as acl4', 'acl4.id', '=', 'atd.coa4_id')
            ->whereIn('acl4.acc_coa_level3_id', $coa3Ids)
            ->where('mtm.company_id', $companyId)
            ->where('mtm.status', 1)
            ->where('mtm.vr_date', '<=', $to)
            ->groupBy('atd.coa4_id')
            ->selectRaw('atd.coa4_id, COALESCE(SUM(atd.debit) - SUM(atd.credit), 0) as balance')
            ->get();

        $total = 0.0;

        foreach ($rows as $row) {
            $balance = (float) $row->balance;

            $total += $debitSide ? max($balance, 0) : max(-$balance, 0);
        }

        return round($total, 2);
    }

    /** The till accounts this company keeps, for the report's own filter. */
    private function cashAccounts(int $companyId): array
    {
        return DB::table('acc_coa_level4s')
            ->where('company_id', $companyId)
            ->where('acc_coa_level3_id', self::CASH_GROUP)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn ($row) => ['id' => (int) $row->id, 'name' => $row->name])
            ->all();
    }

    /**
     * The till's legs.
     *
     * ⚠️ Deleted vouchers are out (status), and so is another company's or
     * another branch's work. Nothing else narrows it: this asks whether the
     * voucher touched a cash head, which is the only question a cash book can
     * honestly put -- a rule about the shape of a voucher number is a rule
     * about numbering, and numbering has changed before.
     */
    private function cashLegs(int $companyId, int $branchId, ?int $cashAccountId)
    {
        return DB::table('main_trx_master as mtm')
            ->join('acc_transaction_master as atm', 'atm.main_trx_id', '=', 'mtm.id')
            ->join('acc_transaction_details as atd', 'atd.trx_mstr_id', '=', 'atm.id')
            ->join('acc_coa_level4s as acl4', 'acl4.id', '=', 'atd.coa4_id')
            ->where('mtm.status', 1)
            ->where('mtm.company_id', $companyId)
            ->where('mtm.branch_id', $branchId)
            ->where('acl4.acc_coa_level3_id', self::CASH_GROUP)
            ->when($cashAccountId, fn ($q, $id) => $q->where('acl4.id', $id));
    }

    /** Every leg of the vouchers in hand, cash ones included. */
    private function allLegs(array $ids)
    {
        $columns = [
            'mtm.id as mtm_id',
            'mtm.vr_no',
            'mtm.vr_date',
            'mtm.voucher_type',
            'mtm.is_approved',
            'mtm.approved_by',
            'mtm.combined_number',
            'atm.id as atm_id',
            'atd.debit',
            'atd.credit',
            'acl4.name as head_name',
            'acl4.acc_coa_level3_id as grp',
        ];

        // The handwritten number arrives with a patch, and this book ships to
        // every installation: a database without it is asked for nothing rather
        // than failing the whole report on an unknown column.
        if (Schema::hasColumn('main_trx_master', 'manual_voucher_no')) {
            $columns[] = 'mtm.manual_voucher_no';
        }

        return DB::table('main_trx_master as mtm')
            ->join('acc_transaction_master as atm', 'atm.main_trx_id', '=', 'mtm.id')
            ->join('acc_transaction_details as atd', 'atd.trx_mstr_id', '=', 'atm.id')
            ->join('acc_coa_level4s as acl4', 'acl4.id', '=', 'atd.coa4_id')
            ->whereIn('mtm.id', $ids)
            ->orderBy('atd.id')
            ->get($columns);
    }
}
