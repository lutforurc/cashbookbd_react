<?php

use App\Http\Controllers\Api\SubscriptionController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth:sanctum')->group(function (): void {
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
        Route::post('/assign', [SubscriptionController::class, 'assign']);
        Route::post('/payments/{paymentId}/approve', [SubscriptionController::class, 'approvePayment']);
        Route::post('/payments/{paymentId}/reject', [SubscriptionController::class, 'rejectPayment']);
    });
});
