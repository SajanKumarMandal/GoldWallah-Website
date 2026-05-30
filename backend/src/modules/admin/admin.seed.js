import bcrypt from "bcryptjs";

import { withTransaction } from "../../config/db.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import {
  ADMIN_AUDIT_ACTIONS,
  writeAdminAuditLog,
} from "./admin.audit.js";
import { SYSTEM_ROLE_DEFINITIONS, ADMIN_PERMISSIONS } from "./admin.permissions.js";
import {
  assignRolesToAdmin,
  countAdminUsers,
  createAdminUser,
  findAdminByEmail,
  upsertAdminPermission,
  upsertAdminRole,
  replaceRolePermissions,
} from "./admin.repository.js";

function permissionDescription(permissionKey) {
  return permissionKey
    .replace(/^admin\./, "")
    .split(".")
    .join(" ");
}

async function seedPermissionsAndRoles(client) {
  for (const permissionKey of ADMIN_PERMISSIONS) {
    await upsertAdminPermission(
      {
        permissionKey,
        description: permissionDescription(permissionKey),
      },
      client,
    );
  }

  const rolesByName = new Map();

  for (const role of SYSTEM_ROLE_DEFINITIONS) {
    const savedRole = await upsertAdminRole(role, client);
    rolesByName.set(role.name, savedRole);
    await replaceRolePermissions(
      {
        roleId: savedRole.id,
        permissionKeys: role.permissions,
      },
      client,
    );
  }

  return rolesByName;
}

export async function seedAdminFoundation() {
  await withTransaction(async (client) => {
    const rolesByName = await seedPermissionsAndRoles(client);
    const adminCount = await countAdminUsers(client);

    if (adminCount > 0) {
      logger.info("Admin permissions and system roles are synced");
      return;
    }

    if (!env.adminSeedEmail || !env.adminSeedPassword) {
      logger.warn(
        "No admin users exist. Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD to seed the first super admin.",
      );
      return;
    }

    const email = env.adminSeedEmail.trim().toLowerCase();

    if (await findAdminByEmail(email, client)) {
      logger.info("Initial super admin already exists");
      return;
    }

    const superAdmin = await createAdminUser(
      {
        name: "Super Admin",
        email,
        passwordHash: await bcrypt.hash(
          env.adminSeedPassword,
          env.bcryptSaltRounds,
        ),
        isSuperAdmin: true,
        passwordChangedAt: null,
      },
      client,
    );
    const superAdminRole = rolesByName.get("SUPER_ADMIN");

    if (superAdminRole) {
      await assignRolesToAdmin(superAdmin.id, [superAdminRole.id], client);
    }

    await writeAdminAuditLog(
      {
        actorAdminId: superAdmin.id,
        action: ADMIN_AUDIT_ACTIONS.seedSuperAdminCreated,
        resourceType: "ADMIN_USER",
        resourceId: superAdmin.id,
        newValue: { email: superAdmin.email, isSuperAdmin: true },
        severity: "CRITICAL",
      },
      client,
    );

    logger.info({ email }, "Initial super admin seeded");
  });
}
