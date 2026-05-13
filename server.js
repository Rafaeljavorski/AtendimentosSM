import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { Octokit } from "@octokit/rest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

const {
  GITHUB_TOKEN,
  GITHUB_OWNER,
  GITHUB_REPO,
  GITHUB_BRANCH = "main",
  GITHUB_DATA_PATH = "data/dados_atendimentos.json",
  PORT = 3000
} = process.env;

function checkEnv() {
  const missing = [];
  if (!GITHUB_TOKEN) missing.push("GITHUB_TOKEN");
  if (!GITHUB_OWNER) missing.push("GITHUB_OWNER");
  if (!GITHUB_REPO) missing.push("GITHUB_REPO");

  if (missing.length) {
    throw new Error("Variáveis ausentes: " + missing.join(", "));
  }
}

function getOctokit() {
  checkEnv();
  return new Octokit({ auth: GITHUB_TOKEN });
}

async function getCurrentFile(octokit) {
  try {
    const res = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: GITHUB_DATA_PATH,
      ref: GITHUB_BRANCH
    });

    if (Array.isArray(res.data)) {
      throw new Error("O caminho configurado aponta para uma pasta, não arquivo.");
    }

    const content = Buffer.from(res.data.content || "", "base64").toString("utf8");
    return {
      sha: res.data.sha,
      content: content ? JSON.parse(content) : { data: [] }
    };
  } catch (err) {
    if (err.status === 404) {
      return { sha: null, content: { data: [] } };
    }
    throw err;
  }
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    storage: "github",
    repo: GITHUB_OWNER && GITHUB_REPO ? `${GITHUB_OWNER}/${GITHUB_REPO}` : null,
    path: GITHUB_DATA_PATH
  });
});

app.get("/api/data", async (req, res) => {
  try {
    const octokit = getOctokit();
    const file = await getCurrentFile(octokit);

    const payload = file.content || {};
    res.json({
      ok: true,
      updatedAt: payload.updatedAt || null,
      total: Array.isArray(payload.data) ? payload.data.length : 0,
      data: Array.isArray(payload.data) ? payload.data : []
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message || "Erro ao carregar dados do GitHub"
    });
  }
});

app.post("/api/data", async (req, res) => {
  try {
    const octokit = getOctokit();
    const body = req.body || {};

    if (!Array.isArray(body.data)) {
      return res.status(400).json({
        ok: false,
        error: "Formato inválido. Esperado: { data: [...] }"
      });
    }

    const file = await getCurrentFile(octokit);

    const payload = {
      updatedAt: new Date().toISOString(),
      total: body.data.length,
      data: body.data
    };

    const content = Buffer.from(JSON.stringify(payload, null, 2), "utf8").toString("base64");

    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: GITHUB_DATA_PATH,
      message: `Atualiza base de atendimentos - ${new Date().toLocaleString("pt-BR")}`,
      content,
      sha: file.sha || undefined,
      branch: GITHUB_BRANCH
    });

    res.json({
      ok: true,
      saved: body.data.length,
      path: GITHUB_DATA_PATH
    });
  } catch (err) {
    res.status(500).json({
      ok: false,
      error: err.message || "Erro ao salvar dados no GitHub"
    });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Dashboard rodando na porta ${PORT}`);
});