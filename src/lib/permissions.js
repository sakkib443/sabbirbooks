'use client';

/**
 * ════════════════════════════════════════════════════════════════════════════
 *  CLIENT MIRROR OF THE SERVER'S CAPABILITY VOCABULARY
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The server is the ONLY authority on what a user may do. It resolves each
 * account's capabilities in `sabbirbooks_server/src/app/config/permissions.ts`
 * and hands the finished list to the browser twice:
 *
 *   • POST /api/auth/login  → data.user.capabilities   (stored by persistSession)
 *   • GET  /api/auth/me     → data.capabilities        (re-read by ProtectedRoute
 *                                                       on every dashboard mount)
 *
 * So `can()` below does not re-implement any rule — it reads that list. Both
 * client layers (route guard + sidebar) call it, which is what keeps the three
 * layers in agreement.
 *
 * The role-default table is duplicated here for exactly two reasons:
 *   1. a session created BEFORE this feature shipped has no `capabilities` on
 *      its stored user, and must not be locked out before its next /auth/me;
 *   2. labels for the admin permission matrix.
 * It is a fallback, never the decision — and it can never grant real access,
 * because every protected route re-checks on the server and returns 403.
 *
 * Keep in sync with app/config/permissions.ts. The test at
 * scratchpad/permissions.test.cjs asserts the two files agree.
 */

export const CAPABILITIES = [
  {
    key: 'content.write',
    label: 'Content — upload & delete',
    group: 'Content',
    description:
      'Create, edit and delete books, book content (QR topics), blogs, courses, lessons, categories, notices, partners, mentor profiles and site pages.',
  },
  {
    key: 'training.manage',
    label: 'Training operations',
    group: 'Training',
    description:
      'Run batches, enrollments, class schedules, certificates, coupons and installment plans.',
  },
  {
    key: 'orders.read',
    label: 'Orders — view',
    group: 'Business data',
    description: 'See book orders: who bought what, delivery addresses and payment state.',
  },
  {
    key: 'orders.write',
    label: 'Orders — approve & update',
    group: 'Business data',
    description: 'Approve or reject manual payments and change fulfilment status.',
  },
  {
    key: 'analytics.read',
    label: 'Analytics & reports',
    group: 'Business data',
    description: 'Dashboards, sales counts, revenue and income reports.',
  },
  {
    key: 'users.read',
    label: 'Users — view',
    group: 'People',
    description: 'See user accounts and their personal details (name, email, phone, address).',
  },
  {
    key: 'users.write',
    label: 'Users — create, edit & delete',
    group: 'People',
    description: 'Create student accounts, edit user details, reset passwords, delete accounts.',
  },
  {
    key: 'settings.write',
    label: 'Site settings',
    group: 'Site',
    description: 'Change the site name, logo, delivery charges and payment options.',
  },
  {
    key: 'staff.manage',
    label: 'Staff & permissions',
    group: 'Site',
    description:
      'Create staff accounts and decide what each manager may do. Reserved for Admin / Super Admin — it can never be granted to a manager.',
  },
];

export const CAPABILITY_KEYS = CAPABILITIES.map((c) => c.key);

/** Never grantable — handing this to a manager would let them escalate themselves. */
export const GRANTABLE_CAPABILITIES = CAPABILITY_KEYS.filter((k) => k !== 'staff.manage');

/** The two kinds of manager whose permissions an admin can edit. */
export const MANAGER_ROLES = ['trainingManager', 'contentManager'];

export const ROLE_LABELS = {
  superAdmin: 'Super Admin',
  admin: 'Admin',
  trainingManager: 'Training Manager',
  contentManager: 'Content Manager',
  mentor: 'Mentor',
  student: 'Student',
  user: 'Student',
};

/** Fallback only — see the header comment. Mirrors ROLE_DEFAULT_CAPABILITIES. */
export const ROLE_DEFAULT_CAPABILITIES = {
  superAdmin: [...CAPABILITY_KEYS],
  admin: [...CAPABILITY_KEYS],
  trainingManager: ['content.write', 'training.manage', 'users.read', 'users.write', 'analytics.read'],
  contentManager: ['content.write'],
  mentor: ['content.write', 'training.manage', 'analytics.read'],
  student: [],
};

/**
 * The capabilities of a stored user object.
 *
 * Order of trust:
 *   1. `capabilities` — resolved by the server, always preferred.
 *   2. `permissions`  — the raw stored array, if an /auth/me call has not landed.
 *   3. the role's defaults.
 */
export const resolveCapabilities = (user) => {
  if (!user) return [];
  if (Array.isArray(user.capabilities)) return user.capabilities;

  const role = user.role === 'user' ? 'student' : user.role;
  if (role === 'superAdmin' || role === 'admin') return [...CAPABILITY_KEYS];
  if (Array.isArray(user.permissions)) {
    return user.permissions.filter((p) => CAPABILITY_KEYS.includes(p) && p !== 'staff.manage');
  }
  return [...(ROLE_DEFAULT_CAPABILITIES[role] || [])];
};

/** Read the logged-in user out of localStorage (both key sets are live). */
export const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('user') || localStorage.getItem('sb_user') || 'null');
  } catch {
    return null;
  }
};

/**
 * Merge server-resolved fields back into the stored user (called after /auth/me).
 *
 * Undefined values are skipped rather than written: a response that omits
 * `capabilities` must leave the previously stored list alone, not erase it and
 * silently drop the user back to role defaults.
 */
export const mergeStoredUser = (patch) => {
  if (typeof window === 'undefined' || !patch) return null;
  const merged = { ...(getStoredUser() || {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) merged[k] = v;
  }
  const json = JSON.stringify(merged);
  localStorage.setItem('user', json);
  localStorage.setItem('sb_user', json);
  return merged;
};

/** True when the user has EVERY listed capability. */
export const can = (user, ...required) => {
  const owned = resolveCapabilities(user);
  return required.every((cap) => owned.includes(cap));
};

/** True when the user has AT LEAST ONE of the listed capabilities. */
export const canAny = (user, ...required) => {
  if (required.length === 0) return true;
  const owned = resolveCapabilities(user);
  return required.some((cap) => owned.includes(cap));
};

/** Convenience wrappers that read localStorage themselves. */
export const currentCan = (...required) => can(getStoredUser(), ...required);
export const currentCanAny = (...required) => canAny(getStoredUser(), ...required);

/**
 * Where a role belongs after login, and where to bounce it when it lands on a
 * dashboard it may not use.
 *
 * BUGFIX: trainingManager used to be sent to `/dashboard/training-manager`,
 * which has never existed — every manager hitting a page they lacked access to
 * got a 404. Managers work inside the admin shell; the sidebar and the server
 * decide what they actually see there.
 *
 * A plain buyer (student/user) lands on the storefront `/`, NOT `/dashboard/user`:
 * the shop's job is selling books, and the course dashboard is empty for someone
 * who only buys. This is the default LANDING, not an access change — a student can
 * still open /dashboard/user from the sidebar. It also matches password
 * registration, which already sends new accounts to `/` (register/page.tsx).
 */
export const homeRouteFor = (role) => {
  switch (role) {
    case 'superAdmin':
    case 'admin':
    case 'trainingManager':
    case 'contentManager':
      return '/dashboard/admin';
    case 'mentor':
      return '/dashboard/mentor';
    case 'student':
    case 'user':
      return '/';
    default:
      return '/';
  }
};

/** Roles that live inside the admin dashboard shell. */
export const ADMIN_SHELL_ROLES = ['superAdmin', 'admin', ...MANAGER_ROLES];
