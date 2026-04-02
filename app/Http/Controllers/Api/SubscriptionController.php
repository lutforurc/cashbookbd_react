<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\SubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function __construct(
        private readonly SubscriptionService $subscriptionService
    ) {
    }

    public function plans(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->subscriptionService->getPlans(),
        ]);
    }

    public function current(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->subscriptionService->getCurrentSubscription($request->user()),
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->subscriptionService->getCompanyPayments($request->user()),
        ]);
    }

    public function manualPayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'plan_id' => ['required', 'integer'],
            'amount' => ['required', 'numeric', 'min:0'],
            'payment_method' => ['required', 'in:bkash,nagad,bank,cash'],
            'billing_months' => ['required', 'integer', 'min:1', 'max:24'],
            'paid_at' => ['required', 'date'],
            'transaction_id' => ['required', 'string', 'max:120'],
            'sender_number' => ['required', 'string', 'max:30'],
            'receiver_account' => ['nullable', 'string', 'max:60'],
            'customer_note' => ['nullable', 'string'],
        ]);

        $payment = $this->subscriptionService->submitManualPayment($request->user(), $validated);

        return response()->json([
            'success' => true,
            'message' => 'Manual payment submitted successfully.',
            'data' => $payment,
        ]);
    }

    public function adminOverview(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->subscriptionService->getAdminOverview(),
        ]);
    }

    public function companies(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->subscriptionService->getCompanies(),
        ]);
    }

    public function tenantSubscriptions(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->subscriptionService->getTenantSubscriptions(
                $request->string('status')->toString()
            ),
        ]);
    }

    public function paymentRequests(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->subscriptionService->getPaymentRequests(
                $request->string('payment_status')->toString()
            ),
        ]);
    }

    public function adminPlans(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->subscriptionService->getAdminPlans(),
        ]);
    }

    public function adminPlan(int $planId): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->subscriptionService->getPlanById($planId),
        ]);
    }

    public function storePlan(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:150'],
            'billing_interval' => ['required', 'string', 'max:50'],
            'price' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'max:10'],
            'trial_days' => ['nullable', 'integer', 'min:0'],
            'max_users' => ['nullable', 'integer', 'min:0'],
            'max_branches' => ['nullable', 'integer', 'min:0'],
            'max_transactions_per_month' => ['nullable', 'integer', 'min:0'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'description' => ['nullable', 'string'],
            'is_active' => ['required', 'boolean'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Subscription plan created successfully.',
            'data' => $this->subscriptionService->createPlan($request->user(), $validated),
        ]);
    }

    public function updatePlan(Request $request, int $planId): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:150'],
            'billing_interval' => ['required', 'string', 'max:50'],
            'price' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', 'max:10'],
            'trial_days' => ['nullable', 'integer', 'min:0'],
            'max_users' => ['nullable', 'integer', 'min:0'],
            'max_branches' => ['nullable', 'integer', 'min:0'],
            'max_transactions_per_month' => ['nullable', 'integer', 'min:0'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'description' => ['nullable', 'string'],
            'is_active' => ['required', 'boolean'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Subscription plan updated successfully.',
            'data' => $this->subscriptionService->updatePlan($request->user(), $planId, $validated),
        ]);
    }

    public function assign(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'company_id' => ['required', 'integer'],
            'plan_id' => ['required', 'integer'],
            'status' => ['required', 'in:trialing,active,pending_payment,expired,suspended,cancelled'],
            'access_status' => ['required', 'in:full,limited,billing_only,blocked'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date'],
            'trial_end_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Subscription assigned successfully.',
            'data' => $this->subscriptionService->assignSubscription($request->user(), $validated),
        ]);
    }

    public function approvePayment(Request $request, int $paymentId): JsonResponse
    {
        $validated = $request->validate([
            'admin_note' => ['nullable', 'string'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment approved successfully.',
            'data' => $this->subscriptionService->approvePayment($request->user(), $paymentId, $validated),
        ]);
    }

    public function rejectPayment(Request $request, int $paymentId): JsonResponse
    {
        $validated = $request->validate([
            'admin_note' => ['nullable', 'string'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Payment rejected successfully.',
            'data' => $this->subscriptionService->rejectPayment($request->user(), $paymentId, $validated),
        ]);
    }
}
