<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\CashPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class CashPaymentController extends Controller
{
    public function __construct(
        private readonly CashPaymentService $cashPaymentService
    ) {
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $record = $this->cashPaymentService->store($request->all());

            return response()->json([
                'success' => true,
                'message' => 'Cash payment saved successfully.',
                'data' => [
                    'data' => $record['voucher_no'],
                    'record' => $record,
                ],
            ]);
        } catch (RuntimeException $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
                'data' => [
                    'data' => [],
                ],
                'error' => [
                    'code' => 422,
                    'message' => $exception->getMessage(),
                ],
            ], 422);
        }
    }

    public function edit(Request $request): JsonResponse
    {
        $record = $this->cashPaymentService->edit($request->all());

        if (!$record) {
            return response()->json([
                'success' => false,
                'message' => 'Cash payment voucher not found.',
                'data' => [
                    'data' => [],
                ],
                'error' => [
                    'code' => 404,
                    'message' => 'Cash payment voucher not found.',
                ],
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Cash payment voucher loaded successfully.',
            'data' => [
                'data' => $record['rows'],
                'record' => $record,
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        try {
            $record = $this->cashPaymentService->update($request->all());

            if (!$record) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cash payment voucher not found.',
                    'data' => [
                        'data' => [],
                    ],
                    'error' => [
                        'code' => 404,
                        'message' => 'Cash payment voucher not found.',
                    ],
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Cash payment updated successfully.',
                'data' => [
                    'data' => $record['voucher_no'],
                    'record' => $record,
                ],
            ]);
        } catch (RuntimeException $exception) {
            return response()->json([
                'success' => false,
                'message' => $exception->getMessage(),
                'data' => [
                    'data' => [],
                ],
                'error' => [
                    'code' => 422,
                    'message' => $exception->getMessage(),
                ],
            ], 422);
        }
    }
}
