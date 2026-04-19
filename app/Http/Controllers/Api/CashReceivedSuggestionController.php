<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CashReceivedSuggestionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $field = trim((string) $request->query('field', 'remarks'));
        $query = trim((string) $request->query('q', ''));

        if ($field !== 'remarks') {
            return response()->json([
                'success' => false,
                'message' => 'Unsupported suggestion field.',
                'data' => [
                    'data' => [],
                ],
            ], 422);
        }

        if ($query === '') {
            return response()->json([
                'success' => true,
                'message' => 'No query provided.',
                'data' => [
                    'data' => [],
                ],
            ]);
        }

        $items = DB::table('acc_transaction_details')
            ->select('remarks')
            ->whereNotNull('remarks')
            ->where('remarks', '!=', '')
            ->where('remarks', 'like', '%' . $query . '%')
            ->distinct()
            ->orderByRaw('CASE WHEN remarks LIKE ? THEN 0 ELSE 1 END', [$query . '%'])
            ->orderBy('remarks')
            ->limit(10)
            ->pluck('remarks')
            ->map(static fn ($remark) => trim((string) $remark))
            ->filter(static fn ($remark) => $remark !== '')
            ->values();

        return response()->json([
            'success' => true,
            'message' => 'Remarks suggestions loaded successfully.',
            'data' => [
                'data' => $items,
            ],
        ]);
    }
}
