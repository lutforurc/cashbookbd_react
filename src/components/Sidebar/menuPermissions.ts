export const MENU_PERMISSIONS = {
  transaction: [
    'cash.received.create',
    'cash.payment.create',
    'bank.received.create',
    'bank.payment.create',
    'hrm.loan.create',
    'journal.create',
    'branch.transfer.create',
    'branch.received.create',
    'inventory.transfer.create',
    'inventory.received.create',
    'product.transfer.create',
    'product.received.create',
  ],
  invoice: ['purchase.create', 'sales.create', 'labour.invoice.create'],
  labour_items: ['labour.category.view', 'labour.item.view'],
  reports: [
    'cashbook.view',
    'installment.create',
    'ledger.view',
    'ledger.labour',
    'ledger.due.view',
    // Ledger Details (Customer Supplier Statement) hangs off this menu on
    // either of these, so both have to open the parent -- otherwise the only
    // permission a user holds gates a screen they can never reach the menu for.
    'ledger.customer',
    'ledger.details',
    'date.wise.total',
    // The Expense Report is only ever reached through this menu, so the
    // permission that shows the entry has to open the parent group too --
    // otherwise a user holding just this one never sees Reports at all.
    'expense.report',
    'product.stock.view',
    'product.in.out',
    'purchase.ledger',
    'sales.ledger',
    'group.report',
    'mitch.match',
    'productwise.profit',
  ],
  requisition: ['requisition.view', 'requisition.create', 'requisition.comparison'],
  // Opens on any of the three: the settings screen and the two reports each
  // stand on their own permission, and holding just one has to be enough to
  // reach the menu, or that permission gates a screen its holder cannot see.
  product_tracking: [
    'product.tracking.settings.view',
    'product.tracking.report.view',
  ],
  products: ['products.view'],
  admin: [
    'check.register.view',
    'branch.view',
    'all.user.view',
    'dayclose.create',
    'order.view',
    'order.avg.price',
    'voucher.approval',
    'remove.approval',
    'change.vourcher.type',
    'voucher.photo.upload',
    'voucher.photo.delete',
    'bulk.photo.upload',
    'roles.view',
    'roles.create',
    'roles.edit',
    'roles.delete',
    'reseller.view',
  ],
  voucher_settings: [
    'voucher.delete',
    'installment.delete',
    'voucher.date.change',
    'voucher.recycle',
    'voucher.history',
    // The Log Changes screen. The permission the backend actually creates is
    // 'log.changes' (Voucher Modification group); 'voucher.changes' was never
    // one, so a user holding only this was kept out of the parent menu here
    // and bounced to /no-access by the route guard.
    'log.changes',
  ],
  hrm: [
    'employee.view',
    'attendance.view',
    'attendance.create',
    'attendance.approve',
    'leave.view',
    'leave.approve',
    'holiday.view',
    'shift.view',
    'salary.generate',
    'salary.sheet.view',
    'employee.loan.ledger.view',
  ],
  roles: ['roles.view', 'roles.create', 'roles.edit', 'roles.delete'],
  customer: [
    'cs.delete',
    'cs.edit',
    'cs.information',
    'cs.ledger',
    'cs.photo.delete',
    'cs.photo.edit',
    'cs.photo.update',
    'cs.photo.view',
    'cs.update',
    'cs.view',
    'coa.l1.view',
    'coa.l2.view',
    'coa.l3.view',
    'coa.l4.view',
    // Bank Opening lives in this menu but answers to a permission of its own, so
    // whoever holds only that one still gets the menu it sits in.
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
  // the menu it lives in. real.estate.view stays: it is what opened the whole
  // module before the screens had permissions of their own.
  real_estate: [
    'real.estate.view',
    'real.estate.project.view',
    'real.estate.building.view',
    'real.estate.floor.view',
    'real.estate.unit.view',
    'real.estate.charge.view',
    'real.estate.layout.view',
    'real.estate.unit.sale.view',
    'real.estate.sold.unit.view',
    'real.estate.project.expense.view',
    'real.estate.project.income.view',
    'real.estate.project.purchase.view',
    'real.estate.project.labour.view',
    'real.estate.project.summary.view',
    'real.estate.project.cost.view',
    'real.estate.project.income.report.view',
  ],
  // Hotel. Any one of the four opens the menu -- the setup screen's four tabs
  // are one screen, and a role given only the room types still has to be able
  // to reach it.
  //
  // The SQL that creates these grants them to nobody, so this menu does not
  // appear anywhere until a hotel is actually set up and somebody hands them
  // out. That is deliberate: fifteen sites run this software and none of them
  // is a hotel.
  hotel: [
    'hotel.building.view',
    'hotel.floor.view',
    'hotel.room.type.view',
    'hotel.resource.view',
    'hotel.booking.view',
  ],
  reseller: ['reseller.dashboard.view'],
  subscription_history: ['subscription.view', 'subscription.history'],
  customer_dashboard: ['customer.dashboard'],
};
