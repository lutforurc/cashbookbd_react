<?php

use App\Http\Controllers\Api\RoleDirectoryController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\OwnerRoleGroupController;
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

    Route::prefix('admin/subscription')->group(function (): void {
        Route::get('/overview', [SubscriptionController::class, 'adminOverview']);
        Route::get('/companies', [SubscriptionController::class, 'companies']);
        Route::get('/tenant-subscriptions', [SubscriptionController::class, 'tenantSubscriptions']);
        Route::get('/payment-requests', [SubscriptionController::class, 'paymentRequests']);
        Route::get('/plans', [SubscriptionController::class, 'adminPlans']);
        Route::get('/plans/{planId}', [SubscriptionController::class, 'adminPlan']);
        Route::post('/plans', [SubscriptionController::class, 'storePlan']);
        Route::post('/plans/{planId}', [SubscriptionController::class, 'updatePlan']);
        Route::post('/assign', [SubscriptionController::class, 'assign']);
        Route::post('/payments/{paymentId}/approve', [SubscriptionController::class, 'approvePayment']);
        Route::post('/payments/{paymentId}/reject', [SubscriptionController::class, 'rejectPayment']);
    });

    Route::prefix('admin/owner-role-group')->group(function (): void {
        Route::get('/', [OwnerRoleGroupController::class, 'show']);
        Route::put('/', [OwnerRoleGroupController::class, 'update']);
        Route::post('/sync', [OwnerRoleGroupController::class, 'sync']);
    });
});
