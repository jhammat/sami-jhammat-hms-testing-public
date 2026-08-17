const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");

/**
 * Metro configuration for this pnpm workspace.
 *
 * pnpm keeps each package's own dependencies in a private, symlinked
 * node_modules nested inside that package (its ".pnpm" virtual store entry) —
 * so resolving a transitive dependency (e.g. @react-navigation/native needing
 * @react-navigation/core) requires Metro to walk up through each package's
 * own node_modules via normal hierarchical lookup, following symlinks along
 * the way. Disabling hierarchical lookup breaks exactly that, and produces
 * "Unable to resolve module" for otherwise-installed transitive dependencies.
 * watchFolders is what actually solves workspace-root resolution (letting
 * Metro see packages hoisted to the repo root's node_modules), so that's the
 * only extra piece needed on top of the defaults.
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.unstable_enableSymlinks = true;

module.exports = config;
