<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\OwnerRoleGroupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OwnerRoleGroupController extends Controller
{
    public function __construct(
        private readonly OwnerRoleGroupService $ownerRoleGroupService
    ) {
    }

    public function show(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->ownerRoleGroupService->getOwnerGroup(),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'permission_ids' => ['required', 'array'],
            'permission_ids.*' => ['integer'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Owner role group updated successfully.',
            'data' => $this->ownerRoleGroupService->updateOwnerGroup(
                $request->user(),
                $validated['permission_ids']
            ),
        ]);
    }

    public function sync(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Owner role group synced successfully.',
            'data' => $this->ownerRoleGroupService->syncOwnerRolesFromGroup($request->user()),
        ]);
    }
}
