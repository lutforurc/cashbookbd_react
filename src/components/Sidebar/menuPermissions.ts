/**
 * Which permissions open each sidebar group.
 *
 * ⚠️ ONE RULE (2026-11-11): every entry inside a group is gated by a permission
 * of its own, and no permission gates two entries. A group's list here is
 * exactly the keys of the entries it holds -- nothing else -- so a group opens
 * if and only if its holder can see at least one thing inside it. A key that
 * gates no entry does not belong here: it would open an empty menu.
 *
 * Adding a screen to a group means adding its key here, on the entry in
 * Sidebar/index.tsx, on its route in App.tsx and on its line in
 * Header/globalSearchItems.ts -- the same key in all four.
 */
export const MENU_PERMISSIONS = {
  transaction: [
    'cash.received.create',
    'cash.payment.create',
    'bank.received.create',
    'bank.payment.create',
    'bank.reconciliation.view',
    'cheque.register.view',
    // The unified Received / Payment Entry, on keys of their own.
    'received.entry.create',
    'payment.entry.create',
    'year.closing.run',
    'budget.view',
    'installment.create',
    'hrm.loan.create',
    'journal.create',
    // Inter-Branch money transfers. The menu answers to "view"; "receive" and
    // "reverse" are what a holder may do once inside.
    'interbranch.transfer.view',
  ],
  invoice: [
    'purchase.create',
    'purchase.import',
    'sales.create',
    'sales.import',
    'purchase.return.view',
    'sales.return',
    'delivery.view',
    'labour.invoice.create',
    'trading.combined.create',
    'tiles.combined.create',
  ],
  labour_items: ['labour.category.view', 'labour.item.view'],
  reports: [
    'cashbook.view',
    'bankbook.view',
    'daily.accounts.book',
    'voucher.register',
    'sales.referrer',
    'bank.book',
    'ageing.report.view',
    'audit.trail.view',
    'cash.bank.summery',
    'bank.information',
    'connected.member.view',
    'installment.due.view',
    'installment.employee.view',
    'ledger.customer',
    'ledger.details',
    'product.in.out',
    'product.in.out.datewise',
    'ledger.labour',
    'due.list',
    'collection.sheet',
    'monthly.report',
    'date.wise.total',
    'product.stock.view',
    'product.stock.details',
    'imei.stock',
    'godown.stock',
    'product.in.out.catwise',
    'purchase.ledger',
    'tiles.purchase.report',
    'sales.ledger',
    'purchase.return.ledger',
    'sales.return.ledger',
    'delivery.report.view',
    'customer.sales.report',
    'group.report',
    'mitch.match',
  ],
  // The statements that used to sit at the foot of Reports. Any one of them
  // opens the parent; each child is then gated on its own permission.
  financial_statement: [
    'productwise.profit',
    'productwise.profit.summary',
    'invoice.wise.profit',
    'profit.loss.date.wise',
    'monthly.statement',
    'trial.balance.l4',
    'trial.balance.l3',
    'trial.balance',
    'expense.report',
    'profit.loss',
    'balancesheet.view',
    'business.summary',
    'cash.flow.statement',
    'general.ledger',
  ],
  requisition: ['requisition.view', 'requisition.create', 'requisition.comparison'],
  // Production (Manufacturing). The group also needs the branch's Manufacture
  // switch on (com_branches.manufactur_control) -- see the sidebar.
  production: [
    'production.create',
    'production.sales.return.create',
    'production.view',
    'production.report.view',
  ],
  product_tracking: [
    'product.tracking.settings.view',
    'product.tracking.report.view',
    'product.tracking.summary.view',
  ],
  // Company scheme: the receivable lists. The sale itself is Invoice -> Sales.
  company_scheme: ['company.scheme.view', 'company.scheme.receipts.view'],
  products: [
    'brand.list',
    'category.view',
    'product_group.view',
    'package.size.view',
    'products.view',
    'product.statement.view',
    'product.opening.edit',
    'low.stock',
    'negative.stock',
    'slow.moving',
    'warehouse.difference',
    'product.unit',
  ],
  admin: [
    'company.view',
    'branch.view',
    'print.template.view',
    'software.information',
    'menu.arrangement',
    'all.user.view',
    'online.users',
    'user.login.log',
    'company.user',
    'reseller.view',
    'admin.notifications.view',
    'admin.in.app.messages.view',
    'business.create',
    'inventory.systems.view',
    'tutorial.videos.manage',
    // Website Templates also needs the server's platform-admin verdict.
    'website.templates.manage',
    'highlight.rules',
    'roles.view',
    'roles.create',
    'permission.create',
    'dayclose.create',
    'group.report.setup',
    'order.view',
    'order.transaction.view',
    'order.avg.price',
    'approval.center',
    'voucher.approval',
    'remove.approval',
    'change.vourcher.type',
    'voucher.photo.upload',
    'bulk.photo.upload',
    'sms.logs',
    'sms.templates',
  ],
  voucher_settings: [
    'voucher.delete',
    'installment.delete',
    'voucher.date.change',
    'voucher.recycle',
    'voucher.history',
    // The Log Changes screen. The permission the backend creates is
    // 'log.changes' (Voucher Modification group).
    'log.changes',
    // Report Mismatch, which repairs a voucher that belongs to no company.
    'mitmatch.report',
  ],
  hrm: [
    'employee.view',
    'hrm.designation.level.view',
    'hrm.designation.view',
    'hrm.attendance.view',
    'hrm.attendance.report.view',
    'hrm.attendance.audit.view',
    'hrm.overtime.report.view',
    'hrm.attendance.monthly.view',
    'hrm.attendance.exception.view',
    'hrm.attendance.employee.view',
    'hrm.attendance.branch.summary.view',
    'hrm.holiday.calendar.view',
    'hrm.leave.view',
    'hrm.attendance.setup.view',
    'salary.generate',
    'festival.bonus.generate',
    'employee.loan.balance.view',
    'employee.loan.ledger.view',
    'salary.sheet.view',
    'hrm.mismatch.payment.view',
    'festival.bonus.view',
  ],
  roles: ['roles.view', 'roles.create', 'permission.create'],
  customer: [
    'cs.view',
    'coa.l4.view',
    'party.opening.edit',
    'coa.l1.view',
    'coa.l2.view',
    'coa.l3.view',
    'bank.opening.view',
  ],
  chart_of_accounts: [
    'coa.l1.view',
    'coa.l2.view',
    'coa.l3.view',
    'coa.l4.view',
  ],
  analytics: ['analytics.comparison'],
  // Every screen inside the menu, so a role given only one of them still sees
  // the menu it lives in. real.estate.view is no longer here: it gated no
  // entry, and the patch seeded the two entries that had no key of their own
  // (Location, Installment Create) onto every role that held it.
  real_estate: [
    'check.register.view',
    'real.estate.area.view',
    'real.estate.project.view',
    'real.estate.building.view',
    'real.estate.floor.view',
    'real.estate.unit.view',
    'real.estate.charge.view',
    'real.estate.layout.view',
    'real.estate.unit.sale.view',
    'real.estate.sold.unit.view',
    'real.estate.sales.summary',
    'real.estate.installment.create',
    'real.estate.project.expense.view',
    'real.estate.project.income.view',
    'real.estate.project.purchase.view',
    'real.estate.project.labour.view',
    'real.estate.project.summary.view',
    'real.estate.project.cost.view',
    'real.estate.project.income.report.view',
  ],
  // Hotel. The setup screen's four tabs are one screen, so any of its four
  // keys opens it; every other entry has one key of its own.
  //
  // The SQL that creates these grants them to nobody, so this menu does not
  // appear anywhere until a hotel is actually set up and somebody hands them
  // out. That is deliberate: fifteen sites run this software and none of them
  // is a hotel.
  hotel: [
    'hotel.booking.view',
    'hotel.calendar.view',
    'hotel.housekeeping.view',
    'hotel.amenity.issue.view',
    'hotel.accounts.transaction.create',
    'hotel.report.view',
    'hotel.booking.due.view',
    'hotel.building.view',
    'hotel.floor.view',
    'hotel.room.type.view',
    'hotel.resource.view',
  ],
  // Fixed assets. One screen with two tabs, each on its own key; either opens
  // the menu. Granted to nobody when the patch creates them.
  asset: ['asset.category.view', 'asset.register.view'],
  // Old Software. Its own group rather than a corner of Reports: looking an old
  // bill up at the counter is not bookkeeping. Each sub-item is gated on its
  // own key.
  legacy: ['legacy.record.view', 'legacy.old.record.view', 'legacy.accounts.view'],
  reseller: ['reseller.dashboard.view'],
  subscription_history: ['subscription.view', 'subscription.history'],
  customer_dashboard: ['customer.dashboard'],
};
