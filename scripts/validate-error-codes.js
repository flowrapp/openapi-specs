#!/usr/bin/env node
/**
 * Validates that all x-functional-errors codes referenced in operation files
 * exist in the error-components.yml catalog.
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
const OPERATIONS_GLOB_BASE = path.join(ROOT, 'api/main-api/rest/v1/services');

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
//    The extension can appear at the operation level inside any path item.
// ---------------------------------------------------------------------------
function extractFunctionalErrors(doc) {
  const found = [];
  if (!doc || typeof doc !== 'object') return found;

  for (const [, pathItem] of Object.entries(doc)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const [, operation] of Object.entries(pathItem)) {
      if (!operation || typeof operation !== 'object') continue;
      if (Array.isArray(operation['x-functional-errors'])) {
        found.push(...operation['x-functional-errors'].map(Number));
      }
    }
  }
  return found;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const validCodes = loadValidCodes(CATALOG_PATH);
const yamlFiles = collectYamlFiles(OPERATIONS_GLOB_BASE);

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
