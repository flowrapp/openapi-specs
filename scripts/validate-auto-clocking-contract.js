#!/usr/bin/env node

// Usage: node scripts/validate-auto-clocking-contract.js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

function resolveRef(file, ref) {
  const [relative, pointer] = ref.split("#");
  const target = path.resolve(
    path.dirname(file),
    relative || path.basename(file),
  );
  const document = yaml.load(fs.readFileSync(target, "utf8"));
  return {
    file: target,
    value: pointer
      .split("/")
      .slice(1)
      .reduce((node, key) => node[key], document),
  };
}

const schemas = [];
for (const [api, prefix] of [
  ["main-api", "/api/v1"],
  ["bff-api", "/api/v1/manager"],
]) {
  const root = path.resolve(__dirname, `../api/${api}/rest/open-api-rest.yml`);
  const spec = yaml.load(fs.readFileSync(root, "utf8"));
  const base = `${prefix}/businesses/{businessId}/settings/auto-clocking`;
  const global = resolveRef(root, spec.paths[base].$ref);
  const individual = resolveRef(
    root,
    spec.paths[`${base}/users/{businessUserId}`].$ref,
  );
  assert.deepEqual(Object.keys(global.value).sort(), ["get", "patch"]);
  assert.deepEqual(Object.keys(individual.value), ["patch"]);

  for (const operation of [
    global.value.get,
    global.value.patch,
    individual.value.patch,
  ]) {
    assert.deepEqual(operation.security, [{ bearerAuth: [] }]);
    assert.match(operation.description, /Requires an OWNER membership/);
    assert.ok(operation.responses["403"]);
    assert.ok(operation.responses["404"]);
  }

  for (const operation of [global.value.patch, individual.value.patch]) {
    assert.equal(operation.requestBody.required, true);
    assert.ok(operation.responses["204"]);
    const request = resolveRef(
      global.file,
      operation.requestBody.content["application/json"].schema.$ref,
    ).value;
    assert.deepEqual(request.required, ["enabled"]);
    assert.deepEqual(Object.keys(request.properties), ["enabled"]);
    assert.equal(request.properties.enabled.type, "boolean");
    assert.equal(request.additionalProperties, false);
  }

  const response = resolveRef(
    global.file,
    global.value.get.responses["200"].content["application/json"].schema.$ref,
  );
  const user = resolveRef(
    response.file,
    response.value.properties.users.items.$ref,
  );
  assert.deepEqual(response.value.required, ["enabled", "users"]);
  assert.deepEqual(user.value.required, [
    "businessUserId",
    "name",
    "role",
    "enabled",
    "effectiveEnabled",
  ]);
  assert.deepEqual(user.value.properties.role.enum, [
    "OWNER",
    "MANAGER",
    "EMPLOYEE",
  ]);
  const example =
    global.value.get.responses["200"].content["application/json"].example;
  for (const member of example.users) {
    assert.equal(member.effectiveEnabled, example.enabled && member.enabled);
  }
  schemas.push(user.value);
}
assert.deepEqual(schemas[0], schemas[1]);
console.log("Auto-clocking contracts and BFF user schemas are consistent.");
