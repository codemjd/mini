import { build } from "esbuild";
import { defineConfig, type Options } from "tsup";

type Plugin = NonNullable<Options["esbuildPlugins"]>[number];

const inlineWorker: Plugin = {
  name: "inline-worker",
  setup(b) {
    b.onResolve({ filter: /^inline-worker:/ }, (args) => ({
      path: new URL(
        args.path.slice("inline-worker:".length) + ".ts",
        `file://${args.resolveDir}/`
      ).pathname,
      namespace: "inline-worker"
    }));
    b.onLoad({ filter: /.*/, namespace: "inline-worker" }, async (args) => {
      const result = await build({
        entryPoints: [args.path],
        bundle: true,
        format: "esm",
        platform: "browser",
        target: "es2022",
        minify: true,
        write: false,
        external: ["node:*", "fs", "path", "module", "url", "worker_threads", "crypto"],
        logLevel: "error"
      });
      return { contents: `export default ${JSON.stringify(result.outputFiles[0].text)};`, loader: "js" };
    });
  }
};

export default defineConfig({
  entry: {
    index: "vendor/nabra-tts/src/index.ts",
    react: "vendor/nabra-tts/src/react.ts"
  },
  outDir: "vendor/nabra-tts/dist",
  format: ["esm"],
  dts: true,
  clean: true,
  splitting: true,
  sourcemap: false,
  target: "es2022",
  platform: "neutral",
  external: ["react", "onnxruntime-web"],
  esbuildPlugins: [inlineWorker]
});
