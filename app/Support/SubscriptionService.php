<?php

namespace App\Support;

use Carbon\Carbon;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class SubscriptionService
{
    public function getPlans(): array
    {
        $plans = DB::table('saas_plans')
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $featuresByPlan = $this->getFeaturesGroupedByPlan($plans->pluck('id')->all());

        return $plans
            ->map(fn ($plan) => $this->formatPlan($plan, $featuresByPlan[(int) $plan->id] ?? []))
            ->all();
    }

    public function getCurrentSubscription(?Authenticatable $user): ?array
    {
        $companyId = $this->resolveCompanyId($user);

        $subscription = $this->subscriptionBaseQuery()
            ->where('ts.company_id', $companyId)
            ->orderByDesc('ts.id')
            ->first();

        if (!$subscription) {
            $subscription = $this->ensureCompanyTrialSubscription($companyId, $user?->id);
        }

        if (!$subscription) {
            return null;
        }

        return $this->formatSubscription(
            $this->syncSubscriptionLifecycle($subscription, $user?->id)
        );
    }

    public function ensureCompanyTrialSubscription(int $companyId, ?int $userId = null): ?array
    {
        return $this->formatSubscription(
            $this->provisionTrialSubscription($companyId, $userId)
        );
    }

    public function getCompanyPayments(?Authenticatable $user): array
    {
        $companyId = $this->resolveCompanyId($user);

        return DB::table('saas_subscription_payments as sp')
            ->leftJoin('saas_plans as p', 'p.id', '=', 'sp.plan_id')
            ->where('sp.company_id', $companyId)
            ->orderByDesc('sp.id')
            ->get([
                'sp.id',
                'sp.payment_method',
                'sp.payment_status',
                'sp.amount',
                'sp.currency',
                'sp.billing_months',
                'sp.paid_at',
                'sp.transaction_id',
                'sp.sender_number',
                'sp.receiver_account',
                'sp.admin_note',
                'sp.customer_note',
                'sp.created_at',
                'p.name as plan_name',
            ])
            ->map(fn ($payment) => (array) $payment)
            ->all();
    }

    public function submitManualPayment(?Authenticatable $user, array $payload): array
    {
        $companyId = $this->resolveCompanyId($user);
        $plan = DB::table('saas_plans')->where('id', $payload['plan_id'])->first();

        if (!$plan) {
            throw new RuntimeException('Selected plan not found.');
        }

        return DB::transaction(function () use ($companyId, $payload, $plan, $user): array {
            $subscription = $this->subscriptionBaseQuery()
                ->where('ts.company_id', $companyId)
                ->orderByDesc('ts.id')
                ->first();

            $subscriptionId = $subscription?->id;
            $now = Carbon::now();

            if (!$subscriptionId) {
                $subscriptionId = DB::table('saas_tenant_subscriptions')->insertGetId([
                    'company_id' => $companyId,
                    'plan_id' => $plan->id,
                    'subscription_code' => 'SUB-' . strtoupper(Str::padLeft((string) random_int(1, 999999), 6, '0')),
                    'status' => 'pending_payment',
                    'access_status' => 'billing_only',
                    'start_date' => null,
                    'end_date' => null,
                    'trial_start_at' => null,
                    'trial_end_at' => null,
                    'next_billing_date' => $now->toDateString(),
                    'created_by' => $user?->id,
                    'updated_by' => $user?->id,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            } else {
                DB::table('saas_tenant_subscriptions')
                    ->where('id', $subscriptionId)
                    ->update([
                        'plan_id' => $plan->id,
                        'status' => 'pending_payment',
                        'access_status' => 'billing_only',
                        'updated_by' => $user?->id,
                        'updated_at' => $now,
                    ]);
            }

            $paymentId = DB::table('saas_subscription_payments')->insertGetId([
                'subscription_id' => $subscriptionId,
                'plan_id' => $plan->id,
                'company_id' => $companyId,
                'payment_method' => $payload['payment_method'],
                'payment_status' => 'pending',
                'amount' => $payload['amount'],
                'currency' => $plan->currency ?? 'BDT',
                'billing_months' => $payload['billing_months'],
                'paid_at' => Carbon::parse($payload['paid_at']),
                'transaction_id' => $payload['transaction_id'],
                'sender_number' => $payload['sender_number'],
                'receiver_account' => $payload['receiver_account'] ?? null,
                'submitted_by_user_id' => $user?->id,
                'customer_note' => $payload['customer_note'] ?? null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $this->logActivity(
                $subscriptionId,
                $companyId,
                'payment_submitted',
                [
                    'payment_id' => $paymentId,
                    'plan_id' => $plan->id,
                    'billing_months' => $payload['billing_months'],
                ],
                $user?->id
            );

            return (array) DB::table('saas_subscription_payments')->where('id', $paymentId)->first();
        });
    }

    public function getAdminOverview(): array
    {
        return [
            'pending_payments' => DB::table('saas_subscription_payments')->where('payment_status', 'pending')->count(),
            'active_subscriptions' => DB::table('saas_tenant_subscriptions')->where('status', 'active')->count(),
            'expired_subscriptions' => DB::table('saas_tenant_subscriptions')->where('status', 'expired')->count(),
            'trial_subscriptions' => DB::table('saas_tenant_subscriptions')->where('status', 'trialing')->count(),
        ];
    }

    public function getCompanies(): array
    {
        return DB::table('companies')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn ($company) => (array) $company)
            ->all();
    }

    public function getTenantSubscriptions(?string $status = null): array
    {
        return $this->subscriptionBaseQuery()
            ->when($status !== null && $status !== '', fn (Builder $query) => $query->where('ts.status', $status))
            ->orderByDesc('ts.id')
            ->get()
            ->map(fn ($subscription) => $this->formatSubscription($this->syncSubscriptionLifecycle($subscription)))
            ->all();
    }

    public function getPaymentRequests(?string $paymentStatus = null): array
    {
        return DB::table('saas_subscription_payments as sp')
            ->leftJoin('saas_tenant_subscriptions as ts', 'ts.id', '=', 'sp.subscription_id')
            ->leftJoin('saas_plans as p', 'p.id', '=', 'sp.plan_id')
            ->leftJoin('companies as c', 'c.id', '=', 'sp.company_id')
            ->when($paymentStatus !== null && $paymentStatus !== '', fn (Builder $query) => $query->where('sp.payment_status', $paymentStatus))
            ->orderByRaw("CASE WHEN sp.payment_status = 'pending' THEN 0 ELSE 1 END")
            ->orderByDesc('sp.id')
            ->get([
                'sp.id',
                'sp.subscription_id',
                'sp.company_id',
                'sp.payment_method',
                'sp.payment_status',
                'sp.amount',
                'sp.currency',
                'sp.billing_months',
                'sp.paid_at',
                'sp.transaction_id',
                'sp.sender_number',
                'sp.receiver_account',
                'sp.admin_note',
                'sp.customer_note',
                'sp.created_at',
                'p.name as plan_name',
                'ts.status as subscription_status',
                'ts.access_status',
                'c.name as company_name',
            ])
            ->map(fn ($payment) => (array) $payment)
            ->all();
    }

    public function assignSubscription(?Authenticatable $user, array $payload): array
    {
        $plan = DB::table('saas_plans')->where('id', $payload['plan_id'])->first();

        if (!$plan) {
            throw new RuntimeException('Selected plan not found.');
        }

        return DB::transaction(function () use ($user, $payload, $plan): array {
            $existing = DB::table('saas_tenant_subscriptions')
                ->where('company_id', $payload['company_id'])
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            $now = Carbon::now();
            $startDate = !empty($payload['start_date']) ? Carbon::parse($payload['start_date'])->toDateString() : null;
            $endDate = !empty($payload['end_date']) ? Carbon::parse($payload['end_date'])->toDateString() : null;
            $trialEndAt = !empty($payload['trial_end_at']) ? Carbon::parse($payload['trial_end_at']) : null;
            $nextBillingDate = $endDate ?: $startDate;

            if ($existing) {
                DB::table('saas_tenant_subscriptions')
                    ->where('id', $existing->id)
                    ->update([
                        'plan_id' => $plan->id,
                        'status' => $payload['status'],
                        'access_status' => $payload['access_status'],
                        'start_date' => $startDate,
                        'end_date' => $endDate,
                        'trial_end_at' => $trialEndAt,
                        'next_billing_date' => $nextBillingDate,
                        'notes' => $payload['notes'] ?? null,
                        'updated_by' => $user?->id,
                        'updated_at' => $now,
                    ]);

                $subscriptionId = (int) $existing->id;
            } else {
                $subscriptionId = (int) DB::table('saas_tenant_subscriptions')->insertGetId([
                    'company_id' => $payload['company_id'],
                    'plan_id' => $plan->id,
                    'subscription_code' => 'SUB-' . strtoupper(Str::padLeft((string) random_int(1, 999999), 6, '0')),
                    'status' => $payload['status'],
                    'access_status' => $payload['access_status'],
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'trial_start_at' => $payload['status'] === 'trialing' ? $now : null,
                    'trial_end_at' => $trialEndAt,
                    'next_billing_date' => $nextBillingDate,
                    'notes' => $payload['notes'] ?? null,
                    'created_by' => $user?->id,
                    'updated_by' => $user?->id,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            $this->logActivity(
                $subscriptionId,
                (int) $payload['company_id'],
                'subscription_assigned',
                [
                    'plan_id' => $plan->id,
                    'status' => $payload['status'],
                    'access_status' => $payload['access_status'],
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                ],
                $user?->id
            );

            return $this->formatSubscription(
                $this->subscriptionBaseQuery()->where('ts.id', $subscriptionId)->first()
            );
        });
    }

    public function approvePayment(?Authenticatable $user, int $paymentId, array $payload): array
    {
        return DB::transaction(function () use ($user, $paymentId, $payload): array {
            $payment = DB::table('saas_subscription_payments')->where('id', $paymentId)->lockForUpdate()->first();

            if (!$payment) {
                throw new RuntimeException('Payment request not found.');
            }

            $subscription = DB::table('saas_tenant_subscriptions')->where('id', $payment->subscription_id)->lockForUpdate()->first();

            if (!$subscription) {
                throw new RuntimeException('Subscription not found.');
            }

            $startDate = $subscription->end_date && Carbon::parse($subscription->end_date)->isFuture()
                ? Carbon::parse($subscription->end_date)->addDay()
                : Carbon::now();

            $endDate = (clone $startDate)->addMonths((int) $payment->billing_months)->subDay();
            $now = Carbon::now();

            DB::table('saas_subscription_payments')
                ->where('id', $paymentId)
                ->update([
                    'payment_status' => 'approved',
                    'approved_at' => $now,
                    'approved_by_user_id' => $user?->id,
                    'admin_note' => $payload['admin_note'] ?? null,
                    'updated_at' => $now,
                ]);

            DB::table('saas_tenant_subscriptions')
                ->where('id', $subscription->id)
                ->update([
                    'plan_id' => $payment->plan_id,
                    'status' => 'active',
                    'access_status' => 'full',
                    'start_date' => $subscription->start_date ?: $startDate->toDateString(),
                    'end_date' => $endDate->toDateString(),
                    'next_billing_date' => $endDate->copy()->addDay()->toDateString(),
                    'last_payment_id' => $paymentId,
                    'renewal_count' => (int) $subscription->renewal_count + 1,
                    'updated_by' => $user?->id,
                    'updated_at' => $now,
                ]);

            $this->logActivity(
                (int) $subscription->id,
                (int) $subscription->company_id,
                'payment_approved',
                [
                    'payment_id' => $paymentId,
                    'plan_id' => $payment->plan_id,
                    'new_end_date' => $endDate->toDateString(),
                ],
                $user?->id
            );

            return $this->formatSubscription(
                $this->subscriptionBaseQuery()->where('ts.id', $subscription->id)->first()
            );
        });
    }

    public function rejectPayment(?Authenticatable $user, int $paymentId, array $payload): array
    {
        return DB::transaction(function () use ($user, $paymentId, $payload): array {
            $payment = DB::table('saas_subscription_payments')->where('id', $paymentId)->lockForUpdate()->first();

            if (!$payment) {
                throw new RuntimeException('Payment request not found.');
            }

            DB::table('saas_subscription_payments')
                ->where('id', $paymentId)
                ->update([
                    'payment_status' => 'rejected',
                    'approved_by_user_id' => $user?->id,
                    'admin_note' => $payload['admin_note'] ?? null,
                    'updated_at' => Carbon::now(),
                ]);

            DB::table('saas_tenant_subscriptions')
                ->where('id', $payment->subscription_id)
                ->update([
                    'status' => 'pending_payment',
                    'access_status' => 'billing_only',
                    'updated_by' => $user?->id,
                    'updated_at' => Carbon::now(),
                ]);

            $this->logActivity(
                (int) $payment->subscription_id,
                (int) $payment->company_id,
                'payment_rejected',
                ['payment_id' => $paymentId],
                $user?->id
            );

            return (array) DB::table('saas_subscription_payments')->where('id', $paymentId)->first();
        });
    }

    private function subscriptionBaseQuery(): Builder
    {
        return DB::table('saas_tenant_subscriptions as ts')
            ->leftJoin('saas_plans as p', 'p.id', '=', 'ts.plan_id')
            ->leftJoin('companies as c', 'c.id', '=', 'ts.company_id')
            ->select([
                'ts.id',
                'ts.company_id',
                'ts.plan_id',
                'ts.subscription_code',
                'ts.status',
                'ts.access_status',
                'ts.start_date',
                'ts.end_date',
                'ts.trial_start_at',
                'ts.trial_end_at',
                'ts.grace_period_end_at',
                'ts.next_billing_date',
                'ts.renewal_count',
                'ts.notes',
                'p.name as plan_name',
                'p.slug as plan_slug',
                'p.price as plan_price',
                'p.currency as plan_currency',
                'c.name as company_name',
            ]);
    }

    private function provisionTrialSubscription(int $companyId, ?int $userId): ?object
    {
        return DB::transaction(function () use ($companyId, $userId): ?object {
            $existing = $this->subscriptionBaseQuery()
                ->where('ts.company_id', $companyId)
                ->orderByDesc('ts.id')
                ->lockForUpdate()
                ->first();

            if ($existing) {
                return $existing;
            }

            $plan = DB::table('saas_plans')
                ->where('is_active', 1)
                ->where('trial_days', '>', 0)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->first();

            if (!$plan) {
                $plan = DB::table('saas_plans')
                    ->where('is_active', 1)
                    ->orderBy('sort_order')
                    ->orderBy('id')
                    ->first();
            }

            if (!$plan) {
                return null;
            }

            $now = Carbon::now();
            $trialDays = max((int) $plan->trial_days, 0);
            $trialEndAt = $trialDays > 0 ? $now->copy()->addDays($trialDays) : null;
            $endDate = $trialEndAt?->toDateString();

            $subscriptionId = DB::table('saas_tenant_subscriptions')->insertGetId([
                'company_id' => $companyId,
                'plan_id' => $plan->id,
                'subscription_code' => 'SUB-' . strtoupper(Str::padLeft((string) random_int(1, 999999), 6, '0')),
                'status' => $trialDays > 0 ? 'trialing' : 'pending_payment',
                'access_status' => $trialDays > 0 ? 'full' : 'billing_only',
                'start_date' => $now->toDateString(),
                'end_date' => $endDate,
                'trial_start_at' => $trialDays > 0 ? $now : null,
                'trial_end_at' => $trialEndAt,
                'next_billing_date' => $endDate ?: $now->toDateString(),
                'notes' => $trialDays > 0
                    ? sprintf('Auto-provisioned %d day trial for new company.', $trialDays)
                    : 'Auto-provisioned subscription placeholder for new company.',
                'created_by' => $userId,
                'updated_by' => $userId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            $this->logActivity(
                $subscriptionId,
                $companyId,
                'trial_auto_provisioned',
                [
                    'plan_id' => (int) $plan->id,
                    'trial_days' => $trialDays,
                ],
                $userId
            );

            return $this->subscriptionBaseQuery()
                ->where('ts.id', $subscriptionId)
                ->first();
        });
    }

    private function syncSubscriptionLifecycle(?object $subscription, ?int $userId = null): ?object
    {
        if (!$subscription) {
            return null;
        }

        if (!$this->shouldMarkSubscriptionExpired($subscription)) {
            return $subscription;
        }

        $now = Carbon::now();

        DB::table('saas_tenant_subscriptions')
            ->where('id', $subscription->id)
            ->update([
                'status' => 'expired',
                'access_status' => 'blocked',
                'updated_by' => $userId,
                'updated_at' => $now,
            ]);

        $this->logActivity(
            (int) $subscription->id,
            (int) $subscription->company_id,
            'subscription_expired',
            [
                'previous_status' => $subscription->status,
                'previous_access_status' => $subscription->access_status,
            ],
            $userId
        );

        return $this->subscriptionBaseQuery()
            ->where('ts.id', $subscription->id)
            ->first();
    }

    private function shouldMarkSubscriptionExpired(object $subscription): bool
    {
        if (in_array($subscription->status, ['expired', 'suspended', 'cancelled'], true)) {
            return false;
        }

        $now = Carbon::now();
        $today = $now->toDateString();

        if ($subscription->status === 'trialing' && $subscription->trial_end_at) {
            return Carbon::parse($subscription->trial_end_at)->lt($now);
        }

        if (in_array($subscription->status, ['trialing', 'active'], true) && $subscription->end_date) {
            return Carbon::parse($subscription->end_date)->toDateString() < $today;
        }

        return false;
    }

    private function formatPlan(object $plan, array $features): array
    {
        return [
            'id' => (int) $plan->id,
            'name' => $plan->name,
            'slug' => $plan->slug,
            'billing_interval' => $plan->billing_interval,
            'price' => (float) $plan->price,
            'currency' => $plan->currency,
            'trial_days' => (int) $plan->trial_days,
            'max_users' => $plan->max_users !== null ? (int) $plan->max_users : null,
            'max_branches' => $plan->max_branches !== null ? (int) $plan->max_branches : null,
            'max_transactions_per_month' => $plan->max_transactions_per_month !== null ? (int) $plan->max_transactions_per_month : null,
            'description' => $plan->description,
            'features' => $features,
        ];
    }

    private function formatSubscription(?object $subscription): ?array
    {
        if (!$subscription) {
            return null;
        }

        return [
            'id' => (int) $subscription->id,
            'company_id' => (int) $subscription->company_id,
            'company_name' => $subscription->company_name,
            'plan_id' => (int) $subscription->plan_id,
            'plan_name' => $subscription->plan_name,
            'plan_slug' => $subscription->plan_slug,
            'plan_price' => $subscription->plan_price !== null ? (float) $subscription->plan_price : null,
            'plan_currency' => $subscription->plan_currency,
            'subscription_code' => $subscription->subscription_code,
            'status' => $subscription->status,
            'access_status' => $subscription->access_status,
            'start_date' => $subscription->start_date,
            'end_date' => $subscription->end_date,
            'trial_start_at' => $subscription->trial_start_at,
            'trial_end_at' => $subscription->trial_end_at,
            'grace_period_end_at' => $subscription->grace_period_end_at,
            'next_billing_date' => $subscription->next_billing_date,
            'renewal_count' => (int) $subscription->renewal_count,
            'notes' => $subscription->notes,
            'features' => $this->getFeaturesForPlan((int) $subscription->plan_id),
        ];
    }

    private function getFeaturesForPlan(int $planId): array
    {
        return DB::table('saas_plan_features')
            ->where('plan_id', $planId)
            ->orderBy('feature_name')
            ->get(['feature_key', 'feature_name', 'feature_value'])
            ->map(fn ($feature) => (array) $feature)
            ->all();
    }

    private function getFeaturesGroupedByPlan(array $planIds): array
    {
        if ($planIds === []) {
            return [];
        }

        $grouped = [];

        DB::table('saas_plan_features')
            ->whereIn('plan_id', $planIds)
            ->orderBy('feature_name')
            ->get(['plan_id', 'feature_key', 'feature_name', 'feature_value'])
            ->each(function ($feature) use (&$grouped): void {
                $grouped[(int) $feature->plan_id][] = [
                    'feature_key' => $feature->feature_key,
                    'feature_name' => $feature->feature_name,
                    'feature_value' => $feature->feature_value,
                ];
            });

        return $grouped;
    }

    private function resolveCompanyId(?Authenticatable $user): int
    {
        if (!$user) {
            throw new AuthenticationException();
        }

        foreach (['company_id', 'current_company_id'] as $field) {
            if (isset($user->{$field}) && $user->{$field}) {
                return (int) $user->{$field};
            }
        }

        if (method_exists($user, 'branch') && $user->branch && isset($user->branch->company_id)) {
            return (int) $user->branch->company_id;
        }

        if (property_exists($user, 'branch_id') && $user->branch_id) {
            $companyId = DB::table('branches')->where('id', $user->branch_id)->value('company_id');
            if ($companyId) {
                return (int) $companyId;
            }
        }

        throw new RuntimeException('Unable to resolve company id for the authenticated user.');
    }

    private function logActivity(int $subscriptionId, int $companyId, string $action, array $details, ?int $userId): void
    {
        DB::table('saas_subscription_activity_logs')->insert([
            'subscription_id' => $subscriptionId,
            'company_id' => $companyId,
            'action' => $action,
            'action_details' => json_encode($details, JSON_UNESCAPED_UNICODE),
            'acted_by_user_id' => $userId,
            'created_at' => Carbon::now(),
        ]);
    }
}
