<?php

namespace App\Support;

use Carbon\Carbon;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

class OwnerRoleGroupService
{
    private const GROUP_CODE = 'owner';

    public function getOwnerGroup(): array
    {
        $group = $this->ensureOwnerGroupExists();

        $permissionRows = DB::table('owner_role_group_permissions as orgp')
            ->join('permissions as p', 'p.id', '=', 'orgp.permission_id')
            ->where('orgp.group_id', $group['id'])
            ->orderBy('p.group_name')
            ->orderBy('p.name')
            ->get([
                'p.id',
                'p.name',
                'p.group_name',
            ]);

        return [
            'id' => (int) $group['id'],
            'code' => $group['code'],
            'name' => $group['name'],
            'description' => $group['description'],
            'permissions' => $permissionRows->map(fn ($row) => (array) $row)->all(),
            'permission_ids' => $permissionRows->pluck('id')->map(fn ($id) => (int) $id)->all(),
            'owner_roles_count' => $this->getOwnerRolesBaseQuery()->count(),
            'uses_role_group_columns' => $this->supportsRoleGroupColumns(),
        ];
    }

    public function updateOwnerGroup(?Authenticatable $user, array $permissionIds): array
    {
        $group = $this->ensureOwnerGroupExists();
        $permissionIds = array_values(array_unique(array_map('intval', $permissionIds)));

        $existingPermissionsCount = DB::table('permissions')
            ->whereIn('id', $permissionIds)
            ->count();

        if ($existingPermissionsCount !== count($permissionIds)) {
            throw new RuntimeException('One or more selected permissions are invalid.');
        }

        DB::transaction(function () use ($group, $permissionIds, $user): void {
            $this->markExistingOwnerRolesAsManaged();

            DB::table('owner_role_group_permissions')
                ->where('group_id', $group['id'])
                ->delete();

            $now = Carbon::now();

            foreach ($permissionIds as $permissionId) {
                DB::table('owner_role_group_permissions')->insert([
                    'group_id' => $group['id'],
                    'permission_id' => $permissionId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }

            DB::table('owner_role_group_audits')->insert([
                'group_id' => $group['id'],
                'changed_by_user_id' => $user?->id,
                'permission_ids' => json_encode($permissionIds, JSON_UNESCAPED_UNICODE),
                'created_at' => $now,
            ]);

            $this->syncOwnerRoles($permissionIds);
        });

        return $this->getOwnerGroup();
    }

    public function syncOwnerRolesFromGroup(?Authenticatable $user = null): array
    {
        $group = $this->ensureOwnerGroupExists();
        $permissionIds = DB::table('owner_role_group_permissions')
            ->where('group_id', $group['id'])
            ->pluck('permission_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        DB::transaction(function () use ($group, $permissionIds, $user): void {
            $this->markExistingOwnerRolesAsManaged();
            $this->syncOwnerRoles($permissionIds);

            DB::table('owner_role_group_audits')->insert([
                'group_id' => $group['id'],
                'changed_by_user_id' => $user?->id,
                'permission_ids' => json_encode($permissionIds, JSON_UNESCAPED_UNICODE),
                'action' => 'manual_sync',
                'created_at' => Carbon::now(),
            ]);
        });

        return $this->getOwnerGroup();
    }

    public function registerOwnerRole(int $roleId): void
    {
        $role = DB::table('roles')->where('id', $roleId)->first();

        if (!$role || strtolower((string) ($role->name ?? '')) !== self::GROUP_CODE) {
            return;
        }

        $group = $this->ensureOwnerGroupExists();

        if ($this->supportsRoleGroupColumns()) {
            DB::table('roles')
                ->where('id', $roleId)
                ->update([
                    'role_group_code' => self::GROUP_CODE,
                    'role_group_sync_enabled' => 1,
                    'updated_at' => Carbon::now(),
                ]);
        }

        $permissionIds = DB::table('owner_role_group_permissions')
            ->where('group_id', $group['id'])
            ->pluck('permission_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        DB::table('role_has_permissions')
            ->where('role_id', $roleId)
            ->delete();

        if ($permissionIds === []) {
            return;
        }

        $rows = [];

        foreach ($permissionIds as $permissionId) {
            $rows[] = [
                'permission_id' => $permissionId,
                'role_id' => $roleId,
            ];
        }

        DB::table('role_has_permissions')->insert($rows);
    }

    private function syncOwnerRoles(array $permissionIds): void
    {
        $ownerRoleIds = $this->getOwnerRolesBaseQuery()->pluck('id')->map(fn ($id) => (int) $id)->all();

        if ($ownerRoleIds === []) {
            return;
        }

        DB::table('role_has_permissions')
            ->whereIn('role_id', $ownerRoleIds)
            ->delete();

        $rows = [];

        foreach ($ownerRoleIds as $roleId) {
            foreach ($permissionIds as $permissionId) {
                $rows[] = [
                    'permission_id' => $permissionId,
                    'role_id' => $roleId,
                ];
            }
        }

        if ($rows !== []) {
            DB::table('role_has_permissions')->insert($rows);
        }
    }

    private function ensureOwnerGroupExists(): array
    {
        $group = DB::table('owner_role_groups')
            ->where('code', self::GROUP_CODE)
            ->first();

        if ($group) {
            return (array) $group;
        }

        $id = DB::table('owner_role_groups')->insertGetId([
            'code' => self::GROUP_CODE,
            'name' => 'Owner Role Group',
            'description' => 'Global permission template applied to every company owner role.',
            'created_at' => Carbon::now(),
            'updated_at' => Carbon::now(),
        ]);

        return (array) DB::table('owner_role_groups')->where('id', $id)->first();
    }

    private function getOwnerRolesBaseQuery(): Builder
    {
        $query = DB::table('roles');

        if ($this->supportsRoleGroupColumns()) {
            return $query
                ->where('role_group_code', self::GROUP_CODE)
                ->where('role_group_sync_enabled', 1);
        }

        return $query->whereRaw('LOWER(name) = ?', [self::GROUP_CODE]);
    }

    private function markExistingOwnerRolesAsManaged(): void
    {
        if (!$this->supportsRoleGroupColumns()) {
            return;
        }

        DB::table('roles')
            ->whereRaw('LOWER(name) = ?', [self::GROUP_CODE])
            ->where(function (Builder $query): void {
                $query
                    ->whereNull('role_group_code')
                    ->orWhere('role_group_code', '!=', self::GROUP_CODE)
                    ->orWhere('role_group_sync_enabled', '!=', 1);
            })
            ->update([
                'role_group_code' => self::GROUP_CODE,
                'role_group_sync_enabled' => 1,
                'updated_at' => Carbon::now(),
            ]);
    }

    private function supportsRoleGroupColumns(): bool
    {
        return Schema::hasColumn('roles', 'role_group_code')
            && Schema::hasColumn('roles', 'role_group_sync_enabled');
    }
}
