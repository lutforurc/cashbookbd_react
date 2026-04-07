<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\ProductLedgerDataService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class ProductLedgerDataController extends Controller
{
    public function __construct(
        private readonly ProductLedgerDataService $productLedgerDataService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'branch_id' => ['required', 'integer'],
            'ledger_id' => ['required', 'integer'],
            'startdate' => ['required', 'string'],
            'enddate' => ['required', 'string'],
        ]);

        try {
            return response()->json([
                'success' => true,
                'message' => 'Product ledger data loaded successfully.',
                'data' => [
                    'data' => $this->productLedgerDataService->getReport($validated),
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
