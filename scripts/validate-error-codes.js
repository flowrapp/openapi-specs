#!/usr/bin/env node
/**
 * Validates that all x-functional-errors codes referenced in operation files
 * exist in the error-components.yml catalog. Both the Main API and the BFF
 * operation files are checked: the BFF propagates Main API functional codes,
 * so it may only use codes of the same catalog.
 *
 * Usage: node scripts/validate-error-codes.js
 *
 * Exit codes:
 *   0 — all codes are valid
 *   1 — one or more unknown codes found
 */

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const ROOT = path.resolve(__dirname, '..');
const CATALOG_PATH = path.join(
  ROOT,
  'api/main-api/rest/v1/components/common/error-components.yml'
);
const OPERATIONS_DIRS = [
  path.join(ROOT, 'api/main-api/rest/v1/services'),
  path.join(ROOT, 'api/bff-api/rest/v1/services'),
];

// ---------------------------------------------------------------------------
// 1. Load valid codes from the catalog
// ---------------------------------------------------------------------------
function loadValidCodes(catalogPath) {
  const raw = fs.readFileSync(catalogPath, 'utf8');
  const doc = yaml.load(raw);
  const enumValues =
    doc?.components?.schemas?.FunctionalErrorCode?.enum ?? [];
  if (enumValues.length === 0) {
    console.error(
      `ERROR: Could not read FunctionalErrorCode enum from ${catalogPath}`
    );
    process.exit(1);
  }
  return new Set(enumValues.map(Number));
}

// ---------------------------------------------------------------------------
// 2. Recursively collect all YAML files under a directory
// ---------------------------------------------------------------------------
function collectYamlFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectYamlFiles(full));
    } else if (entry.isFile() && /\.ya?ml$/i.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// 3. Extract x-functional-errors arrays from a parsed YAML document.
//    Operation files nest path items under a domain key
//    (`worklogs -> clock-in -> post`), so the extension is collected at any
//    depth, not only on the first two levels.
// ---------------------------------------------------------------------------
function extractFunctionalErrors(node, found = []) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node['x-functional-errors'])) {
    found.push(...node['x-functional-errors'].map(Number));
  }
  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') extractFunctionalErrors(value, found);
  }
  return found;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const validCodes = loadValidCodes(CATALOG_PATH);
const yamlFiles = OPERATIONS_DIRS.flatMap(collectYamlFiles);

let hasErrors = false;

for (const filePath of yamlFiles) {
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`ERROR: Failed to parse ${filePath}: ${err.message}`);
    hasErrors = true;
    continue;
  }

  const codes = extractFunctionalErrors(doc);
  for (const code of codes) {
    if (!validCodes.has(code)) {
      const rel = path.relative(ROOT, filePath);
      console.error(
        `UNKNOWN ERROR CODE ${code} in ${rel} — not present in FunctionalErrorCode enum`
      );
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  console.error(
    '\nValidation failed. Add missing codes to error-components.yml or fix the operation files.'
  );
  process.exit(1);
} else {
  console.log(
    `All x-functional-errors codes are valid (checked ${yamlFiles.length} file(s)).`
  );
}
