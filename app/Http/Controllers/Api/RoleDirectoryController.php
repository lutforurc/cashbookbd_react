<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\RoleDirectoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RoleDirectoryController extends Controller
{
    public function __construct(
        private readonly RoleDirectoryService $roleDirectoryService
    ) {
    }

    public function roleList(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->roleDirectoryService->getRoleList($request->user()),
        ]);
    }

    public function ddlRoleList(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->roleDirectoryService->getDdlRoleList($request->user()),
        ]);
    }

    public function selectedPermissions(Request $request, int $roleId): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => [
                'data' => $this->roleDirectoryService->getSelectedPermissions($request->user(), $roleId),
            ],
        ]);
    }

    public function assignPermissions(Request $request, int $roleId): JsonResponse
    {
        $validated = $request->validate([
            '*.permission_id' => ['sometimes', 'integer'],
            '*.id' => ['sometimes', 'integer'],
            '*' => ['sometimes'],
        ]);

        $payload = is_array($request->all()) ? $request->all() : [];

        return response()->json([
            'success' => true,
            'message' => 'Permissions updated successfully.',
            'data' => $this->roleDirectoryService->assignPermissions($request->user(), $roleId, $payload),
        ]);
    }
}
