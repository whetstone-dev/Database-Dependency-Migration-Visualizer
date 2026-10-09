import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const site = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const root = resolve(site, "..");
const configs = [
  {
    slug: "ecommerce",
    title: "Customer ID transition",
    label: "01 / Ecommerce",
    description:
      "A BIGINT-to-UUID proposal reaches foreign keys, a customer summary view, and SQL files.",
    limitation:
      "UUID mapping and production deployment need operational review. Static references are potential consumers.",
    selector: ["public", "customers", "id"],
  },
  {
    slug: "analytics",
    title: "A chain of downstream views",
    label: "02 / Analytics",
    description:
      "Recorded catalog dependencies connect a base relation to downstream views through pg_rewrite ownership.",
    limitation:
      "The supplied catalog records dependencies, not every runtime consumer or the exact CASCADE deletion closure.",
  },
  {
    slug: "high-traffic",
    title: "An index proposal under review",
    label: "03 / Index review",
    description:
      "Review locking hazards, a conditional type rewrite, and concurrent index creation inside a transaction.",
    limitation:
      "Table size and traffic are user-supplied scenario metadata. The tool does not measure downtime or lock duration.",
  },
];

const demos = [];
for (const config of configs) {
  const from = resolve(root, "examples/rendered", config.slug);
  const to = resolve(site, "public/demos", config.slug);
  await mkdir(to, { recursive: true });
  const model = JSON.parse(
    await readFile(resolve(from, "model.dbdep.json"), "utf8"),
  );
  const review = JSON.parse(
    await readFile(resolve(from, "review.json"), "utf8"),
  );
  for (const filename of [
    "report.html",
    "model.dbdep.json",
    "report.md",
    "review.json",
  ]) {
    await copyFile(resolve(from, filename), resolve(to, filename));
  }
  demos.push({
    ...config,
    nodes: model.nodes.length,
    edges: model.edges.length,
    unknowns: model.unknowns.length,
    reviewRisk: review.risk_level,
    snapshot: model.snapshot.id,
  });
}

const ecommerce = JSON.parse(
  await readFile(
    resolve(root, "examples/rendered/ecommerce/model.dbdep.json"),
    "utf8",
  ),
);
const rootNode = ecommerce.nodes.find(
  (n) =>
    n.schema === "public" &&
    n.parent === "customers" &&
    n.name === "id" &&
    n.kind === "column",
);
if (!rootNode)
  throw new Error(
    "The authoritative ecommerce model has no customers.id column.",
  );
const directEdges = ecommerce.edges.filter((e) => e.target === rootNode.id);
const consumerNames = ["orders", "addresses", "customer_summary"];
const consumers = consumerNames.map((name) => {
  const node = ecommerce.nodes.find(
    (n) =>
      (n.parent === name && n.name === "customer_id") ||
      (n.kind === "view" && n.name === name),
  );
  const edge = directEdges.find((e) => e.source === node?.id);
  if (!node || !edge)
    throw new Error(`No direct source-backed dependency for ${name}.`);
  return {
    id: node.id,
    name: node.kind === "view" ? node.name : `${node.parent}.${node.name}`,
    kind: node.kind,
    status: node.status,
    edgeKind: edge.kind,
    edgeId: edge.id,
  };
});
const visited = new Set([rootNode.id]);
const pending = [rootNode.id];
while (pending.length) {
  const target = pending.shift();
  for (const edge of ecommerce.edges.filter((e) => e.target === target)) {
    if (!visited.has(edge.source)) {
      visited.add(edge.source);
      pending.push(edge.source);
    }
  }
}
const data = {
  demos,
  specimen: {
    root: {
      id: rootNode.id,
      name: "customers.id",
      type: rootNode.properties.type,
      status: rootNode.status,
    },
    consumers,
    direct: new Set(
      directEdges.map((e) => e.source).filter((id) => id !== rootNode.id),
    ).size,
    affected: visited.size - 1,
  },
};
await mkdir(resolve(site, "src/data"), { recursive: true });
await writeFile(
  resolve(site, "src/data/demos.json"),
  `${JSON.stringify(data, null, 2)}\n`,
);
await mkdir(resolve(site, "public/docs"), { recursive: true });
for (const filename of ["README.md", "SKILL.md"]) {
  await copyFile(
    resolve(root, filename),
    resolve(site, "public/docs", filename),
  );
}
await copyFile(
  resolve(site, "THIRD_PARTY_NOTICES.md"),
  resolve(site, "public/THIRD_PARTY_NOTICES.md"),
);
await mkdir(resolve(site, "public/licenses"), { recursive: true });
for (const filename of await readdir(resolve(site, "licenses"))) {
  await copyFile(
    resolve(site, "licenses", filename),
    resolve(site, "public/licenses", filename),
  );
}
console.log(
  `Prepared ${demos.length} reports from examples/rendered; ecommerce: ${demos[0].nodes} objects, ${demos[0].edges} edges, ${visited.size - 1} potential dependents.`,
);
