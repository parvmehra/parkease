const path = require("path");

module.exports = {
  rootDir: __dirname,
  testEnvironment: "node",
  roots: [path.resolve(__dirname, "testing")],
  moduleFileExtensions: ["js", "json", "cjs"],
  verbose: true,
  testMatch: ["**/?(*.)+(spec|test).cjs"],
  testTimeout: 20000,
  setupFilesAfterEnv: [path.resolve(__dirname, "testing/jest.setup.cjs")]
};
