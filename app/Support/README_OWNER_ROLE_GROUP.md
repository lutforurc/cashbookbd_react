Owner Role Group integration notes

Goal:
- Keep the current role/permission system intact.
- Treat `Owner` as a globally managed role template.
- New company registration should still create its own `Owner` role, but permissions should come from the global Owner Role Group.
- No database triggers are required.

What to apply
- Run [owner_role_group_schema_cashbook_api.sql](/d:/cashbookbd_react/database/owner_role_group_schema_cashbook_api.sql).
- Add [OwnerRoleGroupService.php](/d:/cashbookbd_react/app/Support/OwnerRoleGroupService.php) to the API project.
- Add [OwnerRoleGroupController.php](/d:/cashbookbd_react/app/Http/Controllers/Api/OwnerRoleGroupController.php) to the API project.
- Add the `admin/owner-role-group` routes from [api.php](/d:/cashbookbd_react/routes/api.php).

Expected behavior
- Super Admin edits the `Owner` role from the Roles screen.
- The backend updates the global Owner Role Group.
- All managed Owner roles across all companies are synced.
- When a new `Owner` role is inserted during company registration, call `OwnerRoleGroupService::registerOwnerRole($roleId)`.

Important assumptions
- Existing `roles`, `permissions`, and `role_has_permissions` tables already exist.
- Owner roles are created with the name `Owner`.
- If your live schema uses different table names or omits `created_at`/`updated_at` on `role_has_permissions`, adjust the SQL accordingly.

Software user role visibility
- This implementation only adds a global template for the `Owner` role.
- The Roles screen now loads roles from `GET /api/ddl/role/role-list`, matching Add/Edit User screens.
- If software-company roles are still not visible, update that DDL endpoint to include them, or add a dedicated role group/scope filter in the backend.
