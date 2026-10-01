import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const raiz = resolve(import.meta.dirname, "..");
const windows = process.platform === "win32";
const executavel = windows ? (process.env.ComSpec ?? "cmd.exe") : "npm";
const prefixo = windows ? ["/d", "/s", "/c", "npm"] : [];
const destinoLeadFlow = resolve(raiz, "public", "LeadFlow");

const executarNpm = (argumentos, diretorio) => {
  execFileSync(executavel, [...prefixo, ...argumentos], {
    cwd: diretorio,
    env: process.env,
    stdio: "inherit",
  });
};

executarNpm(["run", "build"], resolve(raiz, "leadflow"));

rmSync(destinoLeadFlow, { force: true, recursive: true });
mkdirSync(destinoLeadFlow, { recursive: true });
cpSync(resolve(raiz, "leadflow", "dist"), destinoLeadFlow, {
  recursive: true,
});

if (!existsSync(resolve(destinoLeadFlow, "index.html"))) {
  throw new Error("O build do LeadFlow não gerou o arquivo index.html.");
}

executarNpm(["run", "build:site"], raiz);
