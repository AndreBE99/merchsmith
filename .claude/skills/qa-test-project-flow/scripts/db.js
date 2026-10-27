// Opens a Prisma client over the Cloud SQL Node connector, exactly like PrismaService does.
// Needed because the local `cloud-sql-proxy` on :5433 often accepts TCP but drops queries.
// Run from merchsmith-backend with:
//   doppler run -p merchsmith-backend -c dev -- env NODE_PATH=$PWD/node_modules node <script>
// (outside the sandbox: it needs network access to Google).
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const { Connector, IpAddressTypes } = require('@google-cloud/cloud-sql-connector');

module.exports = async function open() {
  const u = new URL(process.env.DATABASE_URL);
  const connector = new Connector();
  const o = await connector.getOptions({
    instanceConnectionName: process.env.CLOUD_SQL_CONNECTION_NAME,
    ipType: IpAddressTypes.PUBLIC,
  });
  const pool = new Pool({
    ...o,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.slice(1) || 'postgres',
    max: 3,
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  prisma.$close = async () => {
    await prisma.$disconnect();
    await pool.end().catch(() => {});
    connector.close();
  };
  return prisma;
};
