<?php

use App\Http\Controllers\Api\RoleDirectoryController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\OwnerRoleGroupController;
use App\Http\Controllers\Api\CashPaymentController;
use App\Http\Controllers\Api\SubscriptionController;
use Illuminate\Support\Facades\Route;

Route::prefix('forgot-password')->group(function (): void {
    Route::post('/request-otp', [PasswordResetController::class, 'requestOtp']);
    Route::post('/verify-otp', [PasswordResetController::class, 'verifyOtp']);
    Route::post('/reset', [PasswordResetController::class, 'reset']);
});

Route::middleware('auth:sanctum')->group(function (): void {
    Route::prefix('role')->group(function (): void {
        Route::get('/role-list', [RoleDirectoryController::class, 'roleList']);
        Route::get('/selected-permissions/{roleId}', [RoleDirectoryController::class, 'selectedPermissions']);
        Route::put('/role-permission-assign/{roleId}', [RoleDirectoryController::class, 'assignPermissions']);
    });

    Route::prefix('ddl/role')->group(function (): void {
        Route::get('/role-list', [RoleDirectoryController::class, 'ddlRoleList']);
    });

    Route::prefix('subscription')->group(function (): void {
        Route::get('/plans', [SubscriptionController::class, 'plans']);
        Route::get('/current', [SubscriptionController::class, 'current']);
        Route::get('/payments', [SubscriptionController::class, 'payments']);
        Route::post('/manual-payment', [SubscriptionController::class, 'manualPayment']);
    });

    Route::prefix('trading/cash/payment')->group(function (): void {
        Route::post('/', [CashPaymentController::class, 'store']);
        Route::post('/api-edit', [CashPaymentController::class, 'edit']);
        Route::post('/api-update', [CashPaymentController::class, 'update']);
    });

    Route::prefix('accounts/payment')->group(function (): void {
        Route::post('/', [CashPaymentController::class, 'store']);
        Route::post('/api-edit', [CashPaymentController::class, 'edit']);
        Route::post('/api-update', [CashPaymentController::class, 'update']);
    });

    Route::prefix('admin/subscription')->group(function (): void {
        Route::get('/overview', [SubscriptionController::class, 'adminOverview'])->name('api/admin/subscription/overview');
        Route::get('/companies', [SubscriptionController::class, 'companies'])->name('api/admin/subscription/companies');
        Route::get('/tenant-subscriptions', [SubscriptionController::class, 'tenantSubscriptions'])->name('api/admin/subscription/tenant-subscriptions');
        Route::get('/payment-requests', [SubscriptionController::class, 'paymentRequests'])->name('api/admin/subscription/payment-requests');
        Route::get('/payments', [SubscriptionController::class, 'paymentRequests'])->name('api/admin/subscription/payments');
        Route::get('/plans', [SubscriptionController::class, 'adminPlans'])->name('api/admin/subscription/plans');
        Route::get('/plans/{planId}', [SubscriptionController::class, 'adminPlan'])->name('api/admin/subscription/plans/show');
        Route::post('/plans', [SubscriptionController::class, 'storePlan'])->name('api/admin/subscription/plans/store');
        Route::post('/plans/{planId}', [SubscriptionController::class, 'updatePlan'])->name('api/admin/subscription/plans/update');
        Route::post('/assign', [SubscriptionController::class, 'assign'])->name('api/admin/subscription/assign');
        Route::post('/payments/{paymentId}/approve', [SubscriptionController::class, 'approvePayment'])->name('api/admin/subscription/payments/approve');
        Route::post('/payments/{paymentId}/reject', [SubscriptionController::class, 'rejectPayment'])->name('api/admin/subscription/payments/reject');
    });

    Route::prefix('admin/owner-role-group')->group(function (): void {
        Route::get('/', [OwnerRoleGroupController::class, 'show']);
        Route::put('/', [OwnerRoleGroupController::class, 'update']);
        Route::post('/sync', [OwnerRoleGroupController::class, 'sync']);
    });
});
