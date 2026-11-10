# Help coverage — every form and report

প্রতিটি সারি `src/App.tsx`-এর একটি route। **Screen** component বা route-এর নাম,
**Route** ঠিকানা, **Topic** `public/help/`-এর বিষয়, **Status** তিনটির একটি:
`done` (লেখা ও `?` আছে), `skipped` (কারণ লেখা), `not done` (এখনো বাকি)।

> **অবস্থা: কাজ চলছে।** নিচে যত সারিতে `not done` আছে, Help সেখানে এখনো যোগ হয়নি।
> এই ফাইলটি ধরেই কাজ আবার শুরু করা যাবে; নতুন কোনো route এলে এটিতে সারি যোগ করতে হবে,
> নাহলে `npm run help:check` ব্যর্থ হবে।

- মোট route: **316**
- done: **299**
- skipped: **17**
- বাকি: **0**

| Screen | Menu path | Route | Topic | Status |
| --- | --- | --- | --- | --- |
| main | Dashboard | `/` | `dashboard` | done |
| account_deletion_request | Account Deletion | `/account-deletion` | — | skipped: public page outside the signed-in Help layout |
| bank_payment | Transaction → Bank Payment | `/accounts/bank/payment` | `bank-payment` | done |
| bank_receive | Transaction → Bank Received | `/accounts/bank/receive` | `bank-received` | done |
| bank_reconciliation | Accounts → Bank Reconciliation | `/accounts/bank/reconciliation` | `bank-reconciliation` | done |
| budget | Accounts → Budget Against Actual | `/accounts/budget` | `budget` | done |
| cash_payment | Transaction → Cash Payment | `/accounts/cash/payment` | `cash-payment` | done |
| cash_received | Transaction → Cash Received | `/accounts/cash/receive` | `cash-received` | done |
| cheque_register | Accounts → Cheque Register | `/accounts/cheque-register` | `cheque-register` | done |
| employee_loan | Accounts → Employee Loan | `/accounts/employee-loan` | `employee-loan` | done |
| employee_loan_balance | Accounts → Employee Loan Balance | `/accounts/employee-loan/balance` | `loan-balance` | done |
| employee_loan_ledger | Accounts → Employee Loan Ledger | `/accounts/employee-loan/ledger` | `loan-ledger` | done |
| inter_branch | Accounts → Inter-Branch Transfer | `/accounts/inter-branch` | `inter-branch` | done |
| journal | Transaction → Journal | `/accounts/journal` | `journal-voucher` | done |
| year_closing | Accounts → Year Closing | `/accounts/year-closing` | `year-closing` | done |
| account_deletion_admin | Admin → Account Deletions | `/admin/account-deletions` | `account-deletions` | done |
| account_deletion_admin_detail | Admin → Account Deletions → Review | `/admin/account-deletions/:id` | `account-deletion-detail` | done |
| bulk_upload | Admin → Bulk Voucher Upload | `/admin/bulk-upload` | `voucher-images` | done |
| business_types | Admin → Business Types | `/admin/business-types` | `admin-business-types` | done |
| day_close | Admin → Day Close | `/admin/dayclose` | `admin-dayclose` | done |
| highlight_rules | Admin → Highlight Rules | `/admin/highlight-rules` | `highlight-rules` | done |
| image_upload | Admin → Upload Voucher Image | `/admin/image-upload` | `voucher-images` | done |
| admin_in_app_messages | Admin → In-App Messages | `/admin/in-app-messages` | `admin-inapp-list` | done |
| admin_in_app_message_create | Admin → In-App Messages → New Campaign | `/admin/in-app-messages/create` | `admin-inapp-form` | done |
| admin_in_app_message_edit | Admin → In-App Messages → Edit | `/admin/in-app-messages/edit/:id` | `admin-inapp-form` | done |
| installment_list | Admin → Installments | `/admin/installment-details` | `admin-installments` | done |
| inventory_systems | Admin → Inventory Systems | `/admin/inventory-systems` | `admin-inventory-systems` | done |
| day_jump | Admin → Jump Date | `/admin/jumpdate` | `admin-jumpdate` | done |
| admin_notifications | Admin → Admin Notifications | `/admin/notifications` | `admin-notifications` | done |
| admin_remove_approval | Admin → Remove Voucher Approval | `/admin/remove-approval` | `admin-remove-approval` | done |
| reseller_admin | Admin → Reseller Admin | `/admin/resellers` | `admin-resellers` | done |
| tutorial_videos | Admin → Tutorial Videos | `/admin/tutorial-videos` | `admin-tutorial-videos` | done |
| unit_payment_list | Admin → Cheque / Receive Register | `/admin/unit-payment-list` | `admin-unit-payments` | done |
| unit_payment_edit | Admin → Cheque / Receive Register → Edit | `/admin/unit-payment/edit/:id` | `admin-unit-payment-form` | done |
| unit_payment_entry | Admin → Cheque / Receive Register → Add New | `/admin/unit-payment/entry` | `admin-unit-payment-form` | done |
| admin_voucher_approval | Admin → Voucher Approval | `/admin/voucher-approval` | `admin-voucher-approval` | done |
| admin_change_date | Admin → Voucher Change Date | `/admin/voucher/date-change` | `admin-voucher-date` | done |
| admin_change_voucher_type | Admin → Change Voucher Type | `/admin/voucher/type-change` | `admin-voucher-type` | done |
| website_templates | Admin → Website Templates | `/admin/website-templates` | `admin-website-templates` | done |
| website_template_editor | Admin → Website Templates → Edit | `/admin/website-templates/:id` | `admin-website-template-editor` | done |
| approval_center | Approval Center | `/approval-center` | `approval-center` | done |
| approval_center_audit | Approval Center → Audit History | `/approval-center/audit` | `approval-audit` | done |
| asset_setup | Assets → Categories | `/asset/setup` | `asset-category` | done |
| branch_add | Setup → Branch List → Add Branch | `/branch/add-branch` | `branch-form` | done |
| branch_edit | Setup → Branch List → Edit | `/branch/branch-edit/:id` | `branch-form` | done |
| branch_list | Setup → Branch List | `/branch/branch-list` | `branch-list` | done |
| brand_create | Products → Brand → New Brand | `/brand/brand-create` | `product-brand` | done |
| brand_list | Products → Brand | `/brand/brand-list` | `product-brand` | done |
| calendar | — | `/calendar` | — | skipped: internal demo page |
| category_list | Products → Category | `/category/category-list` | `product-category` | done |
| category_create | Products → Category → New Category | `/category/create` | `product-category` | done |
| category_edit | Products → Category → Edit | `/category/edit` | `product-category` | done |
| change_password | Profile → Change Password | `/change-password` | `change-password` | done |
| coal1_list | Accounts → Chart of Accounts L1 | `/coal1/coal1-list` | `coa-l1` | done |
| coal2_list | Accounts → Chart of Accounts L2 | `/coal2/coal2-list` | `coa-l2` | done |
| coal3_add | Accounts → Chart of Accounts L3 → New COA L3 | `/coal3/add-coal3` | `coa-l3-form` | done |
| coal3_list | Accounts → Chart of Accounts L3 | `/coal3/coal3-list` | `coa-l3` | done |
| coal3_edit | Accounts → Chart of Accounts L3 → Edit | `/coal3/edit-coal3/:id` | `coa-l3-form` | done |
| coal4_add | Accounts → Accounts Head List → New Head Entry | `/coal4/add-coal4` | `coa-l4-form` | done |
| coal4_list | Accounts → Accounts Head List | `/coal4/coal4-list` | `coa-l4` | done |
| coal4_edit | Accounts → Accounts Head List → Edit | `/coal4/edit-coal4/:id` | `coa-l4-form` | done |
| account_opening_balance | Accounts → Account Opening Balance | `/coal4/opening-balance` | `account-opening-balance` | done |
| company_scheme_receipts | Reports → Company Scheme Receipts | `/company-scheme/receipts` | `scheme-receipts` | done |
| company_scheme_receivable | Reports → Company Scheme Receivable | `/company-scheme/receivable` | `scheme-receivable` | done |
| company_edit | Setup → Company List → Edit | `/company/company-edit/:id` | `company-edit` | done |
| company_list | Setup → Company List | `/company/company-list` | `company-list` | done |
| customer Home | — | `/customer` | — | skipped: customer portal layout, no content of its own |
| customer_dashboard | Customer → Dashboard | `/customer-dashboard` | `customer-dashboard` | done |
| supplier_customer_add | Customers → Add Customer | `/customer-supplier/create` | `customer-supplier-form` | done |
| supplier_customer_edit | Customers → Edit Customer | `/customer-supplier/edit/:id` | `customer-supplier-form` | done |
| supplier_customer_list | Customers → Customer & Supplier | `/customer-supplier/list` | `customer-supplier-list` | done |
| customer Change Password | Customer portal → Change Password | `/customer/change-password` | — | skipped: customer portal page outside the signed-in Help layout |
| customer Login | — | `/customer/login` | — | skipped: customer portal login page |
| customer_opening_import | Customers → Opening Import | `/customer/opening-import` | `customer-opening-import` | done |
| dashboard | Dashboard | `/dashboard` | `dashboard` | done |
| delivery_dashboard | Dashboard → Delivery System | `/delivery/dashboard` | `delivery-dashboard` | done |
| forgot_password | — | `/forgot-password` | — | skipped: password reset |
| form Elements | — | `/forms/form-elements` | — | skipped: template demo page with no business content |
| form Layout | — | `/forms/form-layout` | — | skipped: template demo page with no business content |
| help | — | `/help` | — | skipped: Help page itself |
| hotel_amenity_issue | Hotel → Amenity & Issues | `/hotel/amenity-issue` | `hotel-amenity-issue` | done |
| hotel_amenity_issue_new | Hotel → Amenity & Issues → Issue/Opening/Count | `/hotel/amenity-issue/new` | `hotel-amenity-issue-form` | done |
| hotel_asset_purchase | Hotel → Asset Purchase | `/hotel/assets/purchase` | `hotel-asset-purchase` | done |
| hotel_booking_due | Hotel → Booking Due | `/hotel/booking-due` | `hotel-booking-due` | done |
| hotel_bookings | Hotel → Bookings | `/hotel/bookings` | `hotel-bookings` | done |
| hotel_booking_new | Hotel → Bookings → New Booking | `/hotel/bookings/new` | `hotel-booking-form` | done |
| hotel_calendar | Hotel → Calendar | `/hotel/calendar` | `hotel-calendar` | done |
| hotel_hall_bookings | Hotel → Bookings → Hall Bookings | `/hotel/hall-bookings` | `hotel-hall-bookings` | done |
| hotel_housekeeping | Hotel → Housekeeping | `/hotel/housekeeping` | `hotel-housekeeping` | done |
| hotel_payment_entry | Hotel → Payment Entry | `/hotel/payment-entry` | `hotel-payment-entry` | done |
| hotel_received_entry | Hotel → Received Entry | `/hotel/received-entry` | `hotel-received-entry` | done |
| hotel_reports | Hotel → Reports | `/hotel/reports` | `hotel-reports` | done |
| hotel_setup | Hotel → Hotel Setup | `/hotel/setup` | `hotel-setup` | done |
| hrms_absent_report | HRM → Attendance → Absent Report | `/hrms/attendance/absent-report` | `attendance-daily-reports` | done |
| hrms_attendance_audit_history | HRM → Attendance → Audit History | `/hrms/attendance/audit-history` | `attendance-audit` | done |
| hrms_branch_attendance_summary | HRM → Attendance → Branch Summary | `/hrms/attendance/branch-summary` | `branch-attendance-summary` | done |
| hrms_early_out_report | HRM → Attendance → Early Out Report | `/hrms/attendance/early-out-report` | `attendance-daily-reports` | done |
| hrms_employee_attendance_report | HRM → Attendance → Employee Report | `/hrms/attendance/employee-report` | `employee-attendance-report` | done |
| hrms_attendance_entries | HRM → Attendance → Manual Attendance | `/hrms/attendance/entries` | `manual-attendance` | done |
| hrms_attendance_exception_reports | HRM → Attendance → Exception Reports | `/hrms/attendance/exception-reports` | `attendance-daily-reports` | done |
| hrms_holiday_calendar_report | HRM → Attendance → Holiday Calendar | `/hrms/attendance/holiday-calendar` | `holiday-calendar` | done |
| hrms_late_report | HRM → Attendance → Late Report | `/hrms/attendance/late-report` | `attendance-daily-reports` | done |
| hrms_leave_applications | HRM → Attendance → Leave Applications | `/hrms/attendance/leaves` | `leave-applications` | done |
| hrms_attendance_monthly_report | HRM → Attendance → Monthly Report | `/hrms/attendance/monthly-report` | `monthly-attendance` | done |
| hrms_overtime_report | HRM → Attendance → Overtime Report | `/hrms/attendance/overtime-report` | `overtime-report` | done |
| hrms_attendance_report | HRM → Attendance → Report | `/hrms/attendance/report` | `attendance-daily-reports` | done |
| hrms_attendance_setup | HRM → Attendance → Setup | `/hrms/attendance/setup` | `attendance-setup` | done |
| hrms_designation_level_list | HRM → Designation Level | `/hrms/designation-levels` | `designation-level-list` | done |
| hrms_designation_level_create | HRM → Designation Level → New Level | `/hrms/designation-levels/create` | `designation-level-form` | done |
| hrms_designation_level_edit | HRM → Designation Level → New Level | `/hrms/designation-levels/edit/:id` | `designation-level-form` | done |
| hrms_designation_list | HRM → Designation | `/hrms/designations` | `designation-list` | done |
| hrms_designation_create | HRM → Designation → New Designation | `/hrms/designations/create` | `designation-form` | done |
| hrms_designation_edit | HRM → Designation → New Designation | `/hrms/designations/edit/:id` | `designation-form` | done |
| hrms_employee_add | HRM → Employee → Employee | `/hrms/employee/add` | `employee-form` | done |
| :id | HRM → Employee → Employee | `/hrms/employee/edit/:id` | `employee-form` | done |
| hrms_employee_list | HRM → Employee → Employee List | `/hrms/employees` | `employee-list` | done |
| hrms_festival_bonus_list | HRM → Bonus → Bonus Reports | `/hrms/festival-bonus` | `festival-bonus` | done |
| hrms_festival_bonus_generate | HRM → Bonus → Bonus Generate | `/hrms/festival-bonus/generate` | `festival-bonus-generate` | done |
| hrms_festival_bonus_update | HRM → Bonus → Bonus Reports → Update | `/hrms/festival-bonus/update` | `festival-bonus` | done |
| hrms_salary_sheet_list | HRM → Salary → Salary Sheet | `/hrms/salary-sheet` | `salary-sheet` | done |
| hrms_salary_sheet_update | HRM → Salary → Salary Sheet → Update | `/hrms/salary-sheet/update` | `salary-sheet` | done |
| hrms_salary_generate | HRM → Salary → Salary Generate | `/hrms/salary/salary-generate` | `salary-generate` | done |
| branch_received | Inventory → Branch Receive | `/inventory/branch-received` | `branch-receive` | done |
| branch_transfer | Inventory → Branch Issue | `/inventory/branch-transfer` | `branch-issue` | done |
| material_issue | Inventory → Material Issue | `/inventory/material-issue` | `material-issue` | done |
| product_in | Inventory → Product In | `/inventory/product-in` | `product-in` | done |
| product_in_reason | Inventory → Product In → Reasons | `/inventory/product-in/reasons` | `product-in-reasons` | done |
| product_in_report | Inventory → Product In Register | `/inventory/product-in/register` | `product-in-register` | done |
| product_out | Inventory → Product Out | `/inventory/product-out` | `product-out` | done |
| product_out_reason | Inventory → Product Out → Reasons | `/inventory/product-out/reasons` | `product-out-reasons` | done |
| product_out_report | Inventory → Product Out Register | `/inventory/product-out/register` | `product-out-register` | done |
| production_entry | Production → Production Entry | `/production/entry` | `production-entry` | done |
| production_recipe | Production → Recipe | `/production/recipe` | `production-recipe` | done |
| production_register | Production → Production Register | `/production/register` | `production-register` | done |
| production_costing | Production → Production Register → Detail | `/production/costing/:id` | `production-costing` | done |
| production_sales_return | Production → Production Sales Return | `/production/sales-return` | `production-sales-return` | done |
| inv_delivery | Invoices → Delivery | `/invoice/delivery` | `delivery` | done |
| inv_labour | Invoices → Labour Invoice | `/invoice/labour-invoice` | `labour-invoice` | done |
| inv_purchase_trading | Invoice → Purchase → Trading | `/invoice/purchase` | `purchase-trading` | done |
| inv_purchase_construction | Invoice → Purchase → Construction | `/invoice/purchase` | `purchase-construction` | done |
| inv_purchase_tiles | Invoice → Purchase → Tiles | `/invoice/purchase` | `purchase-tiles` | done |
| inv_purchase_electronics | Invoice → Purchase → Electronics | `/invoice/purchase` | `purchase-electronics` | done |
| inv_purchase_import | Invoices → Purchase Import | `/invoice/purchase-import` | `purchase-import-trading` | done |
| inv_purchase_return_construction | Invoice → Purchase Return → Construction | `/invoice/purchase-return` | `purchase-return-construction` | done |
| inv_purchase_return_tiles | Invoice → Purchase Return → Tiles | `/invoice/purchase-return` | `purchase-return-tiles` | done |
| inv_sales_general | Invoice → Sales → General | `/invoice/sales` | `sales-general` | done |
| inv_sales_trading | Invoice → Sales → Trading | `/invoice/sales` | `sales-trading` | done |
| inv_sales_tiles | Invoice → Sales → Tiles | `/invoice/sales` | `sales-tiles` | done |
| inv_sales_electronics | Invoice → Sales → Electronics | `/invoice/sales` | `sales-electronics` | done |
| inv_sales_company_scheme | Invoice → Sales → Company Scheme | `/invoice/sales` | `sales-company-scheme` | done |
| inv_sales_import | Invoices → Sales Import | `/invoice/sales-import` | `sales-import-trading` | done |
| inv_sales_return_general | Invoice → Sales Return → General | `/invoice/sales-return` | `sales-return-general` | done |
| inv_sales_return_tiles | Invoice → Sales Return → Tiles | `/invoice/sales-return` | `sales-return-tiles` | done |
| inv_tiles_combined | Invoices → Tiles Combined | `/invoice/tiles-combined` | `combined-tiles` | done |
| inv_trading_combined | Invoices → Trading Combined | `/invoice/trading-combined` | `combined-trading` | done |
| invoice_wise_profit | Financial Statement → Invoice Wise Profit | `/reports/invoice-wise-profit` | `invoice-wise-profit` | done |
| item_chart | Analytics → Item Chart | `/item/item-chart` | `item-chart` | done |
| labour_category | Labour Items → Category | `/labour-items/category` | `labour-category` | done |
| labour_category_create | Labour Items → Category → New Category | `/labour-items/category/create` | `labour-category` | done |
| labour_item | Labour Items → Item | `/labour-items/item` | `labour-item` | done |
| labour_item_create | Labour Items → Item → New Item | `/labour-items/item/create` | `labour-item` | done |
| legacy_accounts | Legacy → Old Accounts | `/legacy/accounts` | `legacy-accounts` | done |
| legacy_old_record | Legacy → Older Version Records | `/legacy/old-records` | `legacy-records` | done |
| legacy_record | Legacy → Old Records | `/legacy/records` | `legacy-records` | done |
| login | — | `/login` | — | skipped: login page |
| my_devices | Users → My Devices | `/my-devices` | `my-devices` | done |
| my_tasks | Users → My Tasks | `/my-tasks` | `my-tasks` | done |
| order_list | Orders → Order List | `/order/order-list` | `order-list` | done |
| order_add | Orders → New Order | `/orders/add-order` | `order-form` | done |
| order_avg_price | Orders → Average Price | `/orders/avg-price` | `avg-price` | done |
| order_edit | Orders → Edit | `/orders/edit/:id` | `order-form` | done |
| order_with_transaction | Orders → Order With Transaction | `/orders/with-transaction` | `order-transactions` | done |
| pack_size_list | Products → Pack Size | `/pack-size/pack-size-list` | `product-pack-size` | done |
| product_group_list | Products → Product Group | `/product-group/product-group-list` | `product-group` | done |
| product_unit_create | Products → Unit → New Unit | `/product-unit/unit-create` | `product-unit` | done |
| product_unit_edit | Products → Unit → Edit | `/product-unit/unit-edit/:id` | `product-unit` | done |
| product_unit_list | Products → Unit | `/product-unit/unit-list` | `product-unit` | done |
| product_create | Products → Product List → New | `/product/add-product` | `product-form` | done |
| product_edit | Products → Product List → Edit | `/product/edit/:id` | `product-form` | done |
| product_low_stock | Products → Low Stock | `/product/low-stock` | `product-low-stock` | done |
| product_negative_stock | Products → Negative Stock | `/product/negative-stock` | `product-stock-alerts` | done |
| product_opening_import | Products → Opening Import | `/product/opening-import` | `product-opening-import` | done |
| product_list | Products → Product List | `/product/product-list` | `product-list` | done |
| product_statement | Products → Product Statement | `/product/product-statement` | `product-statement` | done |
| product_slow_moving | Products → Slow Moving | `/product/slow-moving` | `product-stock-alerts` | done |
| product_warehouse_difference | Products → Warehouse Difference | `/product/warehouse-difference` | `product-stock-alerts` | done |
| profile | Profile | `/profile` | `profile` | done |
| real_estate_area_add | Real Estate → Area → New Location | `/real-estate/add-area` | `realestate-area` | done |
| real_estate_add_floor_unit_edit | Real Estate → Unit → Edit Unit | `/real-estate/add-floor-unit/:id` | `realestate-unit-form` | done |
| real_estate_add_floor_unit | Real Estate → Unit → New Unit | `/real-estate/add-unit` | `realestate-unit-form` | done |
| real_estate_area_list | Real Estate → Area | `/real-estate/area-list` | `realestate-area` | done |
| real_estate_add_building_floor | Real Estate → Building → Floor → Add Flat | `/real-estate/building/floor` | `realestate-floor` | done |
| real_estate_floor_list | Real Estate → Building → Floor | `/real-estate/building/floor/list` | `realestate-floor` | done |
| real_estate_buildings_list | Real Estate → Building | `/real-estate/building/list` | `realestate-building` | done |
| real_estate_buildings | Real Estate → Building → New Project | `/real-estate/buildings` | `realestate-building` | done |
| real_estate_flat_layout | Real Estate → Layout | `/real-estate/flat-layout` | `realestate-flat-layout` | done |
| real_estate_installment_create | Real Estate → Installment Create | `/real-estate/installment-create` | `realestate-installment` | done |
| real_estate_project_activities | Real Estate → Project → New Project | `/real-estate/project-activities` | `realestate-project` | done |
| real_estate_project_cost_report | Real Estate → Project Cost | `/real-estate/project-cost-report` | `realestate-project-cost-report` | done |
| real_estate_project_expense | Real Estate → Project Expense | `/real-estate/project-expense` | `realestate-project-expense-income` | done |
| real_estate_project_income | Real Estate → Project Income | `/real-estate/project-income` | `realestate-project-expense-income` | done |
| real_estate_project_income_report | Real Estate → Project Income Report | `/real-estate/project-income-report` | `realestate-project-income-report` | done |
| real_estate_project_labour | Real Estate → Project Labour | `/real-estate/project-labour` | `realestate-project-purchase-labour` | done |
| real_estate_project_list | Real Estate → Project | `/real-estate/project-list` | `realestate-project` | done |
| real_estate_project_purchase | Real Estate → Project Purchase | `/real-estate/project-purchase` | `realestate-project-purchase-labour` | done |
| real_estate_project_summary_report | Real Estate → Project Summary Report | `/real-estate/project-summary-report` | `realestate-project-summary-report` | done |
| real_estate_sold_units | Real Estate → Sold Units | `/real-estate/sold-units` | `realestate-sold-units` | done |
| real_estate_unit_sales | Real Estate → Unit Sales | `/real-estate/unit-sales` | `realestate-unit-sale` | done |
| real_estate_unit_sale_edit | Real Estate → Unit Sales → Edit | `/real-estate/unit-sales/edit/:id` | `realestate-unit-sale` | done |
| real_estate_unit_types_create | Real Estate → Unit Charge Types → New Charge Type | `/real-estate/unit-types/create` | `realestate-charge-type` | done |
| real_estate_unit_types_list | Real Estate → Unit Charge Types | `/real-estate/unit-types/list` | `realestate-charge-type` | done |
| real_estate_floor_unit_list | Real Estate → Unit → Unit List | `/real-estate/unit/list` | `realestate-unit-list` | done |
| public_register | — | `/register` | — | skipped: public registration |
| public_register_otp | — | `/register/otp` | — | skipped: public registration |
| ageing_report | Reports → Ageing | `/reports/ageing` | `ageing` | done |
| audit_trail | Reports → Audit Trail | `/reports/audit-trail` | `audit-trail` | done |
| balance_sheet | Reports → Balance Sheet | `/reports/balance-sheet` | `balance-sheet` | done |
| bank_information | Reports → Bank Information | `/reports/bank-information` | `bank-information` | done |
| report_bankbook | Reports → Bank Book | `/reports/bankbook` | `bank-book` | done |
| report_branch_receive | Reports → Branch Receive | `/reports/branch-receive` | `branch-movement-report` | done |
| report_branch_receive_list | Reports → Branch Receive List | `/reports/branch-receive-list` | `branch-voucher-lists` | done |
| report_branch_stock | Reports → Branch Stock | `/reports/branch-stock` | `branch-stock-report` | done |
| report_branch_transfer | Reports → Branch Transfer | `/reports/branch-transfer` | `branch-movement-report` | done |
| report_branch_transfer_list | Reports → Branch Transfer List | `/reports/branch-transfer-list` | `branch-voucher-lists` | done |
| business_summary | Reports → Business Summary | `/reports/business-summary` | `business-summary` | done |
| cash_bank_received_payment | Reports → Cash & Bank Received Payment | `/reports/cash-bank-received-payment` | `cash-bank-received-payment` | done |
| report_cashbook_two_column | Reports → Cash Book (Two Column) | `/reports/cash-book-two-column` | `cash-book-two-column` | done |
| cash_flow_statement | Reports → Cash Flow | `/reports/cash-flow-statement` | `cash-flow` | done |
| report_cashbook | Reports → Cash Book | `/reports/cashbook` | `cash-book` | done |
| cat_wise_in_out | Reports → Category Wise In/Out | `/reports/cat-wise/in-out` | `cat-wise-in-out` | done |
| report_closing_stock | Reports → Closing Stock | `/reports/closing-stock` | `closing-stock` | done |
| connected_member | Reports → Connected Member | `/reports/connected-member` | `connected-member` | done |
| report_customer_sales | Reports → Customer Sales | `/reports/customer-sales` | `customer-sales-report` | done |
| report_daily_account_book | Reports → Daily Account Book | `/reports/daily-account-book` | `daily-account-book` | done |
| report_date_wise_total | Reports → Date Wise Total | `/reports/date-wise-total-data` | `date-wise-total` | done |
| report_delivery | Reports → Delivery | `/reports/delivery` | `delivery-report` | done |
| due_installment_list | Reports → Due Installments | `/reports/due-installments` | `due-installments` | done |
| report_due_list | Reports → Due List | `/reports/due-list` | `due-list` | done |
| employee_wise_installment | Reports → Employee Wise Installments | `/reports/employee-installment` | `due-installments` | done |
| expense_report | Reports → Expense Report | `/reports/expense-report` | `expense-report` | done |
| general_ledger | Reports → General Ledger | `/reports/general-ledger` | `general-ledger` | done |
| report_godown_stock | Reports → Godown Stock | `/reports/godown-stock` | `godown-stock` | done |
| group_report | Reports → Group Report | `/reports/group-report` | `group-report` | done |
| group_report_setup | Reports → Group Report → Setup | `/reports/group-report/setup` | `group-report-setup` | done |
| hrm_mismatch_payment | Reports → HRM Mismatch Payment | `/reports/hrm-mismatch-payment` | `hrm-mismatch-payment` | done |
| report_date_wise_in_out | Reports → In/Out → Date Wise | `/reports/in-out/date-wise` | `date-wise-in-out` | done |
| report_labour_ledger | Reports → Labour Ledger | `/reports/labour/ledger` | `labour-ledger` | done |
| report_ledger | Reports → Ledger | `/reports/ledger` | `ledger-report` | done |
| customer_supplier_statement | Reports → Ledger with Product | `/reports/ledger-with-product` | `ledger-with-product` | done |
| mitch_match | Reports → Mitch Match | `/reports/mitch-match` | `mitch-match` | done |
| monthly_statement | Reports → Monthly Statement | `/reports/monthly-statement` | `monthly-statement` | done |
| product_financial_statement | Reports → Product Financial Statement | `/reports/product-financial-statement` | `product-financial-statement` | done |
| product_ledger_data | Reports → Product Ledger | `/reports/product-ledger-data` | `product-ledger-data` | done |
| product_profit_loss | Reports → Product Profit/Loss | `/reports/product-profit-loss` | `product-profit-loss` | done |
| product_profit_summary | Reports → Product Profit Summary | `/reports/product-profit-summary` | `product-profit-summary` | done |
| product_tracking_summary | Reports → Product Receivable/Payable | `/reports/product-receivable-payable` | `product-receivable-payable` | done |
| report_product_stock | Reports → Product Stock | `/reports/product/stock` | `product-stock` | done |
| profit_loss | Reports → Profit & Loss | `/reports/profit-loss` | `profit-loss` | done |
| profit_loss_date_wise | Reports → Profit & Loss (Date Wise) | `/reports/profit-loss-date-wise` | `profit-loss-date-wise` | done |
| purchase_ledger | Reports → Purchase Ledger | `/reports/purchase-ledger` | `purchase-ledger` | done |
| purchase_return_ledger | Reports → Purchase Return Ledger | `/reports/purchase-return-ledger` | `return-ledger` | done |
| sales_ledger | Reports → Sales Ledger | `/reports/sales-ledger` | `sales-ledger` | done |
| report_referrer | Reports → Sales Referrer | `/reports/sales-referrer` | `sales-referrer` | done |
| sales_return_ledger | Reports → Sales Return Ledger | `/reports/sales-return-ledger` | `return-ledger` | done |
| report_sales_summary | Reports → Sales Summary | `/reports/sales-summary` | `sales-summary` | done |
| report_imei_stock | Reports → Stock → IMEI | `/reports/stock-imei` | `imei-stock` | done |
| report_tiles_purchase | Reports → Tiles Purchase | `/reports/tiles-purchase` | `tiles-purchase-report` | done |
| trial_balance | Reports → Trial Balance | `/reports/trialbalance` | `trial-balance` | done |
| trial_balance_level3 | Reports → Trial Balance (Level 3) | `/reports/trialbalance-level3` | `trial-balance` | done |
| trial_balance_level4 | Reports → Trial Balance (Level 4) | `/reports/trialbalance-level4` | `trial-balance` | done |
| report_voucher_register | Reports → Voucher Register | `/reports/voucher-register` | `voucher-register` | done |
| requisition_comparison | Requisition → Comparison | `/requisition/comparison` | `requisition-analysis` | done |
| requisition_create | Requisition → New Requisition | `/requisition/create` | `requisition-form` | done |
| requisition | Requisition → Requisition List | `/requisitions` | `requisition-list` | done |
| reseller_dashboard | Reseller → Dashboard | `/reseller/dashboard` | `reseller-dashboard` | done |
| print_template_designer | Settings → Delivery Challan Layout | `/settings/challan-layout` | `print-layout` | done |
| menu_arrangement | Settings → Arrange Menu | `/settings/menu-arrangement` | `menu-arrangement` | done |
| order_template_designer | Settings → Order Layout | `/settings/order-layout` | `print-layout` | done |
| product_tracking_settings | Settings → Product Tracking | `/settings/product-tracking` | `product-tracking-settings` | done |
| software_info | Settings → Software Information | `/settings/software-info` | `software-info` | done |
| sms_send | SMS → SMS Logs | `/sms/send` | `sms-log` | done |
| sms_template_list | SMS → Templates | `/sms/templates` | `sms-template-list` | done |
| sms_template_create | SMS → Templates → New Template | `/sms/templates/create` | `sms-template-form` | done |
| sms_template_edit | SMS → Templates → Edit | `/sms/templates/edit/:id` | `sms-template-form` | done |
| somity_collection_sheet | Reports → Collection Sheet | `/somity-report/collection-sheet` | `somity-collection-sheet` | done |
| somity_monthly_report | Reports → Monthly Report | `/somity-report/monthly-report` | `somity-monthly-report` | done |
| somity_stock_details | Somity Report → Stock Details | `/somity-report/stock-details` | `closing-stock` | done |
| subscription_admin | Subscription → Subscription Admin | `/subscription/admin` | `subscription-admin` | done |
| subscription_plan_list | Subscription → Subscription Admin → Plan List | `/subscription/admin/plans` | `subscription-plans` | done |
| subscription_plan_edit | Subscription → Plans → Edit | `/subscription/admin/plans/edit/:id` | `subscription-plan-form` | done |
| subscription_plan_entry | Subscription → Plans → New Plan | `/subscription/admin/plans/entry` | `subscription-plan-form` | done |
| subscription_billing_history | Subscription → Billing History | `/subscription/billing-history` | `subscription-billing-history` | done |
| my_subscription | Subscription → My Plan | `/subscription/my-plan` | `subscription-my-plan` | done |
| subscription_payment_submit | Subscription → Submit Payment | `/subscription/payment-submit` | `subscription-payment-submit` | done |
| subscription_pricing | Subscription → Pricing | `/subscription/pricing` | `subscription-pricing` | done |
| switch_branch | Switch Branch | `/switch-branch` | `switch-branch` | done |
| alert | — | `/ui/alerts` | — | skipped: template demo page with no business content |
| buttons | — | `/ui/buttons` | — | skipped: template demo page with no business content |
| add_permission | Users → Roles → Add Permission | `/user-management/create-permission` | `add-permission` | done |
| add_role | Users → Roles → Add Role | `/user-management/create-role` | `add-role` | done |
| roles | Users → Roles | `/user-management/roles` | `roles` | done |
| user_add | Users → Add User | `/user/add-user` | `user-form` | done |
| company_user_list | Users → Company Users | `/user/company-users` | `company-users` | done |
| user_login_log | Users → Login History | `/user/login-log` | `login-log` | done |
| online_users | Users → Online Users | `/user/online-users` | `online-users` | done |
| user_edit | Users → Edit User | `/user/user-edit/:id` | `user-form` | done |
| user_list | Users → User List | `/user/user-list` | `user-list` | done |
| installment_delete | Voucher Settings → Installment Delete | `/vr-settings/installment-delete` | `installment-delete` | done |
| recyclebin | Voucher Settings → Recycle Bin | `/vr-settings/recyclebin` | `recycle-bin` | done |
| report_mismatch | Voucher Settings → Report Mismatch | `/vr-settings/report-mismatch` | `report-mismatch` | done |
| voucher_activity | Voucher Settings → Log Changes | `/vr-settings/voucher-activity` | `voucher-activity` | done |
| voucher_delete | Voucher Settings → Voucher Delete | `/vr-settings/voucher-delete` | `voucher-delete` | done |
| voucher_history | Voucher Settings → Log History | `/vr-settings/voucher-history` | `voucher-history` | done |
| hello-bangladesh | — | `hello-bangladesh` | — | skipped: test route |
| no-access | — | `no-access` | — | skipped: access-denied page |

## Sidebar exceptions

| Screen | Menu path | Route | Topic | Status |
| --- | --- | --- | --- | --- |
| Check Register | — | `/admin/check-register` | — | skipped: its Sidebar link is commented out (not rendered) |
