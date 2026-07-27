import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// Identificador único desta build (carimbo de tempo). É embutido no bundle como
// __APP_VERSION__ e também gravado em /version.json. O app compara os dois em tempo
// de execução para detectar que houve um novo deploy e se auto-atualizar (importante
// para o app instalado como PWA, que pode ficar dias aberto).
const BUILD_ID = String(Date.now());

function versionPlugin(): Plugin {
  return {
    name: "jurisgest-version-json",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version: BUILD_ID }),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), versionPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_ID),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
