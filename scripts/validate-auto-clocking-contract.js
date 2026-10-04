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
const geofencingSchemas = [];
const currentUserSchemas = [];
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

  const geofencingBase = `${prefix}/businesses/{businessId}/settings/geofencing`;
  const geofencing = resolveRef(root, spec.paths[geofencingBase].$ref);
  const userGeofencing = resolveRef(
    root,
    spec.paths[`${geofencingBase}/users/{businessUserId}`].$ref,
  );
  assert.deepEqual(Object.keys(geofencing.value).sort(), ["get", "patch"]);
  assert.deepEqual(Object.keys(userGeofencing.value), ["patch"]);
  const policies = ["ALLOW", "WARN", "BLOCK"];
  for (const operation of [
    geofencing.value.get,
    geofencing.value.patch,
    userGeofencing.value.patch,
  ]) {
    assert.deepEqual(operation.security, [{ bearerAuth: [] }]);
    assert.match(operation.description, /Requires an OWNER membership/);
    assert.match(operation.description, /clock-in and\s+clock-out/);
    for (const status of ["401", "403", "404"]) {
      assert.ok(operation.responses[status]);
    }
  }
  for (const operation of [geofencing.value.patch, userGeofencing.value.patch]) {
    assert.equal(operation.requestBody.required, true);
    assert.ok(operation.responses["400"]);
    assert.ok(operation.responses["204"]);
    assert.equal(operation.responses["204"].content, undefined);
    const request = resolveRef(
      geofencing.file,
      operation.requestBody.content["application/json"].schema.$ref,
    );
    assert.deepEqual(request.value.required, ["policy"]);
    assert.deepEqual(Object.keys(request.value.properties), ["policy"]);
    assert.equal(request.value.additionalProperties, false);
    const policy = resolveRef(request.file, request.value.properties.policy.$ref);
    assert.equal(policy.value.type, "string");
    assert.deepEqual(policy.value.enum, policies);
    assert.ok(policies.includes(
      operation.requestBody.content["application/json"].example.policy,
    ));
  }
  const settings = resolveRef(
    geofencing.file,
    geofencing.value.get.responses["200"].content["application/json"].schema.$ref,
  );
  const memberSettings = resolveRef(
    settings.file,
    settings.value.properties.users.items.$ref,
  );
  assert.deepEqual(settings.value.required, ["policy", "users"]);
  assert.deepEqual(memberSettings.value.required, [
    "businessUserId",
    "name",
    "role",
    "policy",
    "effectivePolicy",
  ]);
  assert.deepEqual(
    memberSettings.value.properties.role.enum,
    user.value.properties.role.enum,
  );
  for (const property of [
    settings.value.properties.policy,
    memberSettings.value.properties.policy,
    memberSettings.value.properties.effectivePolicy,
  ]) {
    const policy = resolveRef(settings.file, property.$ref).value;
    assert.deepEqual(policy.enum, policies);
    assert.match(policy.description, /default to ALLOW/);
  }
  const geofencingExample =
    geofencing.value.get.responses["200"].content["application/json"].example;
  assert.ok(policies.includes(geofencingExample.policy));
  for (const member of geofencingExample.users) {
    assert.ok(policies.includes(member.policy));
    assert.equal(
      member.effectivePolicy,
      policies[Math.max(
        policies.indexOf(geofencingExample.policy), policies.indexOf(member.policy),
      )],
    );
  }
  geofencingSchemas.push(memberSettings.value);

  const ownSchemas = [];
  for (const [setting, field] of [
    ["auto-clocking", "effectiveEnabled"],
    ["geofencing", "effectivePolicy"],
  ]) {
    const ownPath = api === "main-api"
      ? `/api/v1/businesses/{businessId}/settings/${setting}/users/me`
      : `/api/v1/worker/businesses/{businessId}/settings/${setting}`;
    const own = resolveRef(root, spec.paths[ownPath].$ref);
    assert.deepEqual(Object.keys(own.value), ["get"]);
    const operation = own.value.get;
    assert.deepEqual(operation.security, [{ bearerAuth: [] }]);
    assert.match(operation.description, /bearer token/);
    assert.match(operation.description, /OWNER, MANAGER, or EMPLOYEE/);
    assert.deepEqual(operation.parameters.map(parameter => parameter.name), ["businessId"]);
    assert.equal(operation.parameters[0].in, "path");
    assert.equal(operation.parameters[0].required, true);
    assert.equal(operation.parameters[0].schema.minimum, 1);
    assert.equal(operation.requestBody, undefined);
    for (const status of ["401", "403", "404"]) {
      const error = operation.responses[status].content["application/problem+json"];
      assert.equal(resolveRef(own.file, error.schema.$ref).value.type, "object");
    }
    if (api === "main-api") {
      assert.deepEqual(operation["x-functional-errors"], [1006, 1015]);
    }
    const content = operation.responses["200"].content["application/json"];
    const ownSchema = resolveRef(own.file, content.schema.$ref);
    assert.equal(ownSchema.value.additionalProperties, false);
    assert.deepEqual(ownSchema.value.required, [field]);
    assert.deepEqual(Object.keys(ownSchema.value.properties), [field]);
    assert.deepEqual(Object.keys(content.example), [field]);
    if (setting === "auto-clocking") {
      assert.equal(ownSchema.value.properties[field].type, "boolean");
      assert.equal(typeof content.example[field], "boolean");
      assert.match(operation.description, /switch AND the individual preference/);
      assert.match(operation.description, /default to true/);
    } else {
      const policy = resolveRef(ownSchema.file, ownSchema.value.properties[field].$ref);
      assert.deepEqual(policy.value.enum, policies);
      assert.ok(policies.includes(content.example[field]));
      assert.match(operation.description, /ALLOW < WARN < BLOCK/);
      assert.match(operation.description, /default to ALLOW/);
      assert.match(operation.description, /clock-in and clock-out/);
    }
    ownSchemas.push(ownSchema.value);
  }
  currentUserSchemas.push(ownSchemas);
}
assert.deepEqual(schemas[0], schemas[1]);
assert.deepEqual(geofencingSchemas[0], geofencingSchemas[1]);
assert.deepEqual(currentUserSchemas[0], currentUserSchemas[1]);
console.log("Auto-clocking and geofencing contracts and BFF user schemas are consistent.");
