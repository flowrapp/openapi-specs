#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const root = path.resolve(__dirname, '..');
const load = (file) => yaml.load(fs.readFileSync(path.join(root, file), 'utf8'));
function reference(file, ref) {
  const [target, pointer] = ref.split('#');
  const relative = path.join(path.dirname(file), target);
  return pointer.split('/').slice(1).reduce((value, key) => value[key.replace(/~1/g, '/').replace(/~0/g, '~')], load(relative));
}

const states = [];
for (const api of ['main-api', 'bff-api']) {
  const base = `api/${api}/rest`;
  const main = api === 'main-api';
  const rootSpec = load(`${base}/open-api-rest.yml`);
  const source = `${base}/v1/services/${main ? 'worklogs/worklogs-operations.yml' : 'worker/worker-operations.yml'}`;
  const deviceFile = `${base}/v1/services/${main ? 'worklogs' : 'worker'}/device-worklog-operations.yml`;
  const device = load(deviceFile).deviceWorklogs;
  const old = load(source)[main ? 'worklogs' : 'worker'];
  const commands = [
    ['clock-out', 'put', 'clock-out', 'clock-out'],
    ['start-break', 'post', main ? 'start-break' : 'break-start', 'breaks'],
    ['end-break', 'put', main ? 'end-break' : 'break-end', 'breaks/{breakId}/end'],
  ];
  for (const [key, verb, oldKey, suffix] of commands) {
    const op = device[key][verb];
    const prior = old[oldKey][verb];
    const route = `/api/v1/device/businesses/{businessId}/worklogs/{worklogId}/${suffix}`;
    assert.ok(rootSpec.paths[route]);
    assert.deepEqual(op.security, [{geofenceDeviceCredential: []}]);
    assert.deepEqual(op.requestBody.$ref ? reference(deviceFile, op.requestBody.$ref) : op.requestBody, prior.requestBody);
    for (const status of ['200', '400', '403', '404']) {
      const actual = op.responses[status].$ref ? reference(deviceFile, op.responses[status].$ref) : op.responses[status];
      assert.deepEqual(actual.content, prior.responses[status].content);
    }
    assert.ok(op.responses['409']);
  }
  const tokens = load(`${base}/v1/services/liveClock/live-clock-operations.yml`).liveClock;
  for (const op of [tokens.device.delete, tokens['start-token'].put, tokens['start-token'].delete, tokens['update-token'].put, tokens['update-token'].delete]) {
    assert.deepEqual(op.security, [{bearerAuth: []}]);
    assert.ok(op.responses['204']);
  }
  const state = load(`${base}/v1/components/liveClock/components.yml`).components.schemas.LiveClockState;
  states.push(state);
  assert.deepEqual(new Set(state.required), new Set(Object.keys(state.properties)));
  for (const [name, property] of Object.entries(state.properties)) {
    if (name.endsWith('EpochSeconds')) assert.equal(property.format, 'int64');
  }
  assert.equal(state.example.timerStartEpochSeconds, state.example.asOfEpochSeconds - state.example.workedSeconds);
}
assert.deepEqual(states[0], states[1]);
const examples = [...fs.readFileSync(path.join(root, 'docs/live-clock-push.md'), 'utf8').matchAll(/```json\n([\s\S]*?)\n```/g)].map((match) => JSON.parse(match[1]));
const ios = examples[0].message.apns.payload.aps;
const android = examples[1].message.data;
assert.equal(ios['attributes-type'], 'LiveClockAttributes');
assert.equal(android.type, 'LIVE_CLOCK');
assert.deepEqual(ios['content-state'], states[0].example);
assert.deepEqual(JSON.parse(android.state), states[0].example);
console.log('Live clock device commands, tokens, state and push examples are consistent.');
