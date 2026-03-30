Manual subscription backend scaffold

Files added:
- [routes/api.php](/f:/All_Database/cashbookbd_react/routes/api.php)
- [SubscriptionController.php](/f:/All_Database/cashbookbd_react/app/Http/Controllers/Api/SubscriptionController.php)
- [SubscriptionService.php](/f:/All_Database/cashbookbd_react/app/Support/SubscriptionService.php)

Assumptions:
- Your Laravel API uses `auth:sanctum`
- `companies` table exists with `id`, `name`
- `branches` table exists with `id`, `company_id`
- Authenticated user has either `company_id`, `current_company_id`, or `branch_id`

Available endpoints:
- `GET /api/subscription/plans`
- `GET /api/subscription/current`
- `GET /api/subscription/payments`
- `POST /api/subscription/manual-payment`
- `GET /api/admin/subscription/overview`
- `GET /api/admin/subscription/tenant-subscriptions`
- `GET /api/admin/subscription/payment-requests`
- `POST /api/admin/subscription/payments/{paymentId}/approve`
- `POST /api/admin/subscription/payments/{paymentId}/reject`

If your backend already has a base `Controller.php`, use the existing file and ignore the scaffold copy here.
