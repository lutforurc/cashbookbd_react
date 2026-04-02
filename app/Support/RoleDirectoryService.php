<?php

namespace App\Support;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class RoleDirectoryService
{
    public function getRoleList(?Authenticatable $user): array
    {
        return [
            'data' => $this->baseRoleQuery($user)
                ->orderByRaw('CASE WHEN company_id IS NULL THEN 0 ELSE 1 END')
                ->orderBy('name')
                ->get()
                ->map(fn ($role) => [
                    'id' => (int) $role->id,
                    'team_id' => $role->team_id !== null ? (int) $role->team_id : null,
                    'company_id' => $role->company_id !== null ? (int) $role->company_id : null,
                    'name' => (string) $role->name,
                ])
                ->all(),
        ];
    }

    public function getDdlRoleList(?Authenticatable $user): array
    {
        return $this->baseRoleQuery($user)
            ->orderByRaw('CASE WHEN company_id IS NULL THEN 0 ELSE 1 END')
            ->orderBy('name')
            ->get()
            ->map(fn ($role) => [
                'id' => (int) $role->id,
                'name' => (string) $role->name,
            ])
            ->all();
    }

    public function getSelectedPermissions(?Authenticatable $user, int $roleId): array
    {
        $role = $this->findVisibleRole($user, $roleId);

        if (!$role) {
            throw new RuntimeException('Role not found.');
        }

        return DB::table('role_has_permissions as rhp')
            ->join('permissions as p', 'p.id', '=', 'rhp.permission_id')
            ->where('rhp.role_id', $roleId)
            ->orderBy('p.group_name')
            ->orderBy('p.name')
            ->get([
                'p.id',
                'p.name',
                'p.group_name',
            ])
            ->map(fn ($permission) => (array) $permission)
            ->all();
    }

    public function assignPermissions(?Authenticatable $user, int $roleId, array $payload): array
    {
        $role = $this->findVisibleRole($user, $roleId);

        if (!$role) {
            throw new RuntimeException('Role not found.');
        }

        $permissionIds = collect($payload)
            ->map(function ($item) {
                if (is_array($item)) {
                    return $item['permission_id'] ?? $item['id'] ?? null;
                }

                if (is_numeric($item)) {
                    return (int) $item;
                }

                return null;
            })
            ->filter(fn ($id) => $id !== null)
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $validCount = DB::table('permissions')->whereIn('id', $permissionIds)->count();
        if ($validCount !== count($permissionIds)) {
            throw new RuntimeException('One or more selected permissions are invalid.');
        }

        DB::transaction(function () use ($roleId, $permissionIds): void {
            DB::table('role_has_permissions')->where('role_id', $roleId)->delete();

            if ($permissionIds === []) {
                return;
            }

            $rows = collect($permissionIds)
                ->map(fn ($permissionId) => [
                    'permission_id' => $permissionId,
                    'role_id' => $roleId,
                ])
                ->all();

            DB::table('role_has_permissions')->insert($rows);
        });

        return [
            'role_id' => $roleId,
            'permission_ids' => $permissionIds,
        ];
    }

    private function baseRoleQuery(?Authenticatable $user)
    {
        $companyId = $this->resolveCompanyId($user);
        $teamId = $this->resolveTeamId($user);

        return DB::table('roles')
            ->where('guard_name', 'web')
            ->where(function ($query) use ($companyId, $teamId): void {
                $query->whereNull('company_id');

                if ($companyId !== null) {
                    $query->orWhere('company_id', $companyId);
                }

                if ($teamId !== null) {
                    $query->orWhere('team_id', $teamId);
                }
            });
    }

    private function findVisibleRole(?Authenticatable $user, int $roleId): ?object
    {
        return $this->baseRoleQuery($user)
            ->where('id', $roleId)
            ->first();
    }

    private function resolveCompanyId(?Authenticatable $user): ?int
    {
        $companyId = $user?->company_id ?? $user?->companyId ?? null;
        return is_numeric($companyId) ? (int) $companyId : null;
    }

    private function resolveTeamId(?Authenticatable $user): ?int
    {
        $teamId = $user?->team_id ?? $user?->current_team_id ?? $user?->teamId ?? null;
        return is_numeric($teamId) ? (int) $teamId : null;
    }
}
