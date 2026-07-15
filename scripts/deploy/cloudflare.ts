import Cloudflare from "cloudflare";
import "dotenv/config";

const getEnv = () => ({
  CF_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID!,
  CF_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
  CUSTOM_DOMAIN: process.env.CUSTOM_DOMAIN,
  PROJECT_NAME: process.env.PROJECT_NAME || "moemail",
  DATABASE_NAME: process.env.DATABASE_NAME || "moemail-db",
  KV_NAMESPACE_NAME: process.env.KV_NAMESPACE_NAME || "moemail-kv",
  DATABASE_ID: process.env.DATABASE_ID,
});

let _client: Cloudflare | null = null;
const getClient = () => {
  if (_client) return _client;
  const { CF_API_TOKEN, CF_ACCOUNT_ID } = getEnv();
  if (!CF_API_TOKEN) {
    throw new Error("CLOUDFLARE_API_TOKEN is empty/undefined at client init");
  }
  console.log(
    `CF token present: len=${CF_API_TOKEN.length}, prefix=${CF_API_TOKEN.slice(0, 5)}, account=${CF_ACCOUNT_ID?.slice(0, 8)}...`
  );
  _client = new Cloudflare({ apiToken: CF_API_TOKEN });
  return _client;
};

export const getPages = async () => {
  const projectInfo = await getClient().pages.projects.get(getEnv().PROJECT_NAME, {
    account_id: getEnv().CF_ACCOUNT_ID,
  });

  return projectInfo;
};

export const createPages = async () => {
  console.log(`🆕 Creating new Cloudflare Pages project: "${getEnv().PROJECT_NAME}"`);

  const project = await getClient().pages.projects.create({
    account_id: getEnv().CF_ACCOUNT_ID,
    name: getEnv().PROJECT_NAME,
    production_branch: "main",
  });

  if (getEnv().CUSTOM_DOMAIN) {
    console.log("🔗 Setting pages domain...");

    await getClient().pages.projects.domains.create(getEnv().PROJECT_NAME, {
      account_id: getEnv().CF_ACCOUNT_ID,
      name: getEnv().CUSTOM_DOMAIN,
    });

    console.log("✅ Pages domain set successfully");
  }

  console.log("✅ Project created successfully");

  return project;
};

export const getDatabase = async () => {
  if (getEnv().DATABASE_ID) {
    return {
      uuid: getEnv().DATABASE_ID,
    }
  }

  const database = await getClient().d1.database.get(getEnv().DATABASE_NAME, {
    account_id: getEnv().CF_ACCOUNT_ID,
  });

  return database;
};

export const createDatabase = async () => {
  console.log(`🆕 Creating new D1 database: "${getEnv().DATABASE_NAME}"`);

  const database = await getClient().d1.database.create({
    account_id: getEnv().CF_ACCOUNT_ID,
    name: getEnv().DATABASE_NAME,
  });

  console.log("✅ Database created successfully");

  return database;
};

export const getKVNamespaceList = async () => {
  const kvNamespaces = [];

  for await (const namespace of getClient().kv.namespaces.list({
    account_id: getEnv().CF_ACCOUNT_ID,
  })) {
    kvNamespaces.push(namespace);
  }

  return kvNamespaces;
};

export const createKVNamespace = async () => {
  console.log(`🆕 Creating new KV namespace: "${getEnv().KV_NAMESPACE_NAME}"`);

  const kvNamespace = await getClient().kv.namespaces.create({
    account_id: getEnv().CF_ACCOUNT_ID,
    title: getEnv().KV_NAMESPACE_NAME,
  });

  console.log("✅ KV namespace created successfully");

  return kvNamespace;
};
