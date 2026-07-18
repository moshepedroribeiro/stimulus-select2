import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"

export default {
  input: "src/index.js",
  output: [
    {
      file: "dist/index.js",
      format: "cjs", // CommonJS para ferramentas antigas
      exports: "auto"
    },
    {
      file: "dist/index.modern.js",
      format: "es" // ES Modules para builders modernos (Vite, Esbuild, Webpack)
    }
  ],
  external: ["@hotwired/stimulus"], // Não inclui o Stimulus dentro do seu pacote final
  plugins: [
    resolve(),
    commonjs()
  ]
}