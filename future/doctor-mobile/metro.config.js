const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

/**
 * Metro configuration for this pnpm workspace.
 *
 * Without it Metro resolves the `expo-router/entry` entry point relative to the
 * repository root and walks past it into a non-existent path, so release
 * bundling fails with "Unable to resolve module". pnpm also stores real
 * packages under `node_modules/.pnpm`, so the workspace root must be watched
 * and hierarchical lookup disabled to keep resolution deterministic.
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// pnpm symlinks packages; Metro must follow them rather than search upwards.
config.resolver.disableHierarchicalLookup = true;
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
