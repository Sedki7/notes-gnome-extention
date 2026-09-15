import * as esbuild from "esbuild";

await esbuild.build({
    entryPoints: ["src/extension.ts"],
    bundle: true,
    outfile: "extension.js",
    format: "esm",
    platform: "neutral",
    target: "es2022",
    sourcemap: "inline",

    external: [
        "gi://*",
        "resource://*"
    ]
});