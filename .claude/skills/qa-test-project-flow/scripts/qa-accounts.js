// Create (idempotently) QA persona users attached to EXISTING orgs, and add them to
// admin@platform.com's persona switcher (users.metadata.dev_persona_accounts).
//
// Usage (from merchsmith-backend, outside the sandbox):
//   doppler run -p merchsmith-backend -c dev -- env NODE_PATH=$PWD/node_modules \
//     node ../.claude/skills/qa-test-project-flow/scripts/qa-accounts.js '<json>'
//
// <json> = array of { alias, email, name, like }
//   like = email of an EXISTING user in the target org with the wanted role; the new user copies
//          that user's organisation, environment, membership and roles.
//   e.g. [{"alias":"QA Customer","email":"qa.customer@testcustomer.test","name":"QA Customer","like":"admin@customer.com"}]
// With no argument it prints the existing orgs/users so you can pick `like` values.
//
// Rules learned the hard way:
//  - Distributor/customer: users.organisation_id + distributor_environment_id + a
//    user_environment_memberships row + membership roles (copied from `like`).
//  - GLOBAL supplier org (organisations.distributor_environment_id IS NULL): NO membership is possible
//    (trigger validate_user_environment_membership_organisation) and users.distributor_environment_id
//    must be NULL (trigger validate_user_environment_consistency). Role goes in user_roles
//    (global supplier.admin). The backend AuthGuard must select the org from users.organisation_id.
//  - Password is random and never printed: access is through the persona switcher only.
const open = require('./db.js');
const crypto = require('crypto');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

(async () => {
  const p = await open();
  try {
    const arg = process.argv[2];
    if (!arg) {
      const rows = await p.$queryRawUnsafe(
        `select o.type::text type, o.name org, o.distributor_environment_id::text env, u.email, u.status::text status
           from organisations o left join users u on u.organisation_id = o.id
          where o.archived_at is null and o.status = 'active' order by 1, 2, 4`);
      for (const r of rows) console.log(JSON.stringify(r));
      return;
    }
    const specs = JSON.parse(arg);
    if (!getApps().length) initializeApp(process.env.GCP_PROJECT_ID ? { projectId: process.env.GCP_PROJECT_ID } : undefined);
    const auth = getAuth();
    const out = [];
    for (const s of specs) {
      const ref = await p.users.findUnique({ where: { email: s.like } });
      if (!ref) throw new Error(`reference user ${s.like} not found`);
      const refOrg = await p.organisations.findUnique({ where: { id: ref.organisation_id } });
      const globalSupplier = refOrg.type === 'supplier' && !refOrg.distributor_environment_id;
      let uid;
      try { uid = (await auth.getUserByEmail(s.email)).uid; }
      catch (e) {
        if (e.code !== 'auth/user-not-found') throw e;
        uid = crypto.randomUUID(); // users.auth_user_id is a uuid column
        await auth.createUser({ uid, email: s.email, password: crypto.randomBytes(18).toString('base64url'), displayName: s.name, emailVerified: true });
      }
      let u = await p.users.findUnique({ where: { email: s.email } });
      if (!u) u = await p.users.create({ data: {
        auth_user_id: uid, email: s.email, full_name: s.name, status: 'active',
        organisation_id: ref.organisation_id,
        distributor_environment_id: globalSupplier ? null : ref.distributor_environment_id } });
      if (globalSupplier) {
        const refRoles = await p.user_roles.findMany({ where: { user_id: ref.id, revoked_at: null } });
        const roleIds = refRoles.length ? refRoles.map((r) => r.role_id)
          : [(await p.roles.findFirst({ where: { scope: 'supplier', code: 'supplier.admin', distributor_environment_id: null } })).id];
        for (const role_id of roleIds) await p.user_roles.upsert({
          where: { user_id_role_id: { user_id: u.id, role_id } }, update: { revoked_at: null }, create: { user_id: u.id, role_id } });
      } else if (!(await p.user_environment_memberships.findFirst({ where: { user_id: u.id, archived_at: null } }))) {
        const refM = await p.user_environment_memberships.findFirst({
          where: { user_id: ref.id, archived_at: null }, include: { user_environment_membership_roles: { where: { revoked_at: null } } } });
        const m = await p.user_environment_memberships.create({ data: {
          user_id: u.id, distributor_environment_id: refM.distributor_environment_id, organisation_id: refM.organisation_id,
          status: 'active', is_default: true, created_by: ref.id } });
        for (const r of refM.user_environment_membership_roles)
          await p.user_environment_membership_roles.create({ data: { user_environment_membership_id: m.id, role_id: r.role_id } });
      }
      out.push({ ...s, id: u.id });
    }
    const plat = await p.users.findUnique({ where: { email: 'admin@platform.com' } });
    const md = plat.metadata || {};
    const list = Array.isArray(md.dev_persona_accounts) ? md.dev_persona_accounts : [];
    for (const o of out) if (!list.some((x) => x.user_id === o.id)) list.push({ user_id: o.id, alias: o.alias });
    await p.users.update({ where: { id: plat.id }, data: { metadata: { ...md, dev_persona_accounts: list } } });
    console.log(JSON.stringify(out.map((o) => ({ email: o.email, id: o.id, alias: o.alias }))));
  } finally {
    await p.$close();
    process.exit(0);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
