import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/smart-timer-card.ts",
  output: [
    {
      file: "smart-timer-card.js",
      format: "es",
      name: "SmartTimerCard",
      inlineDynamicImports: true,
    },
    {
      file: "dist/smart-timer-card.js",
      format: "es",
      name: "SmartTimerCard",
      inlineDynamicImports: true,
      plugins: [terser({ compress: { drop_console: true } })],
    },
  ],
  plugins: [
    nodeResolve(),
    typescript({
      tsconfig: "tsconfig.json",
    }),
  ],
};