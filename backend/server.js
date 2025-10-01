import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import session from "express-session";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// Configuração do __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config();

const app = express();

// Verificar variáveis essenciais
if (!process.env.JWT_SECRET) {
    console.error('❌ ERRO: JWT_SECRET não definida no .env');
    process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3000;

console.log('✅ Ambiente:', process.env.NODE_ENV || 'development');
console.log('✅ Porta do servidor:', PORT);

// Middlewares
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ===== CONFIGURAÇÃO DE SESSÕES =====
app.use(
    session({
        secret: "prova-online-secret-key-2025-estavel-e-seguro",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false,
            maxAge: 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: "lax",
            path: "/",
        },
        rolling: true,
    })
);

const activeSessions = new Map();
app.use((req, res, next) => {
    if (req.session && req.session.user) {
        activeSessions.set(req.sessionID, {
            userId: req.session.user.id,
            lastAccess: Date.now(),
        });
    }
    next();
});

setInterval(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    for (const [sessionId, sessionData] of activeSessions.entries()) {
        if (now - sessionData.lastAccess > oneDay) {
            activeSessions.delete(sessionId);
        }
    }
    console.log("Sessões ativas:", activeSessions.size);
}, 60 * 60 * 1000);

app.use((req, res, next) => {
    if (!req.session) {
        return next(new Error("Session not available"));
    }
    next();
});

// Middleware de logging
app.use((req, res, next) => {
    console.log(`[DEBUG] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ===== INICIALIZAÇÃO DO BANCO DE DADOS =====
let db;
async function initializeDatabase() {
    try {
        const dbDir = path.join(__dirname, "database");
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        db = await open({
            filename: path.join(dbDir, "database.db"),
            driver: sqlite3.Database,
        });
        console.log("✅ Banco de dados conectado com sucesso!");
        await createTables();
        await migrateUsersFromJson();
        const userCount = await db.get("SELECT COUNT(*) as count FROM usuarios");
        if (userCount.count === 0) {
            console.log('📚 Banco de dados vazio. Inserindo usuários de teste...');
            const usuariosTeste = [
                {
                    id: uuidv4(),
                    nome: "Professor Teste",
                    cpf: "12345678901",
                    senha: "senha123",
                    tipo: "professor",
                    turma: null,
                    data_cadastro: new Date().toISOString(),
                },
                {
                    id: uuidv4(),
                    nome: "Aluno Teste",
                    cpf: "10987654321",
                    senha: "senha123",
                    tipo: "aluno",
                    turma: "3A",
                    data_cadastro: new Date().toISOString(),
                },
            ];
            for (const user of usuariosTeste) {
                await db.run(`
                    INSERT INTO usuarios (id, nome, cpf, senha, tipo, turma, data_cadastro)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `, [
                    user.id,
                    user.nome,
                    user.cpf,
                    user.senha,
                    user.tipo,
                    user.turma,
                    user.data_cadastro
                ]);
                console.log(`✅ Usuário de teste inserido: ${user.nome}`);
            }
        }
    } catch (error) {
        console.error("❌ Erro ao conectar com o banco de dados:", error);
        process.exit(1);
    }
}

async function createTables() {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS usuarios (
            id TEXT PRIMARY KEY,
            nome TEXT NOT NULL,
            cpf TEXT UNIQUE NOT NULL,
            senha TEXT NOT NULL,
            tipo TEXT NOT NULL CHECK (tipo IN ('aluno', 'professor')),
            turma TEXT,
            data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await db.exec(`
        CREATE TABLE IF NOT EXISTS provas (
            id TEXT PRIMARY KEY,
            titulo TEXT NOT NULL,
            disciplina TEXT NOT NULL,
            professor_cpf TEXT NOT NULL,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            data_limite DATE,
            tempo_limite INTEGER,
            descricao TEXT
        )
    `);
    await db.exec(`
        CREATE TABLE IF NOT EXISTS questoes (
            id TEXT PRIMARY KEY,
            prova_id TEXT NOT NULL,
            tipo TEXT NOT NULL CHECK (tipo IN ('multipla_escolha', 'verdadeiro_falso', 'dissertativa')),
            enunciado TEXT NOT NULL,
            valor REAL DEFAULT 1.0,
            ordem INTEGER,
            FOREIGN KEY (prova_id) REFERENCES provas(id) ON DELETE CASCADE
        )
    `);
    await db.exec(`
        CREATE TABLE IF NOT EXISTS alternativas (
            id TEXT PRIMARY KEY,
            questao_id TEXT NOT NULL,
            texto TEXT NOT NULL,
            correta INTEGER DEFAULT 0,
            ordem INTEGER,
            FOREIGN KEY (questao_id) REFERENCES questoes(id) ON DELETE CASCADE
        )
    `);
    await db.exec(`
        CREATE TABLE IF NOT EXISTS respostas (
            id TEXT PRIMARY KEY,
            prova_id TEXT NOT NULL,
            aluno_cpf TEXT NOT NULL,
            questao_id TEXT NOT NULL,
            resposta TEXT,
            correta INTEGER DEFAULT 0,
            data_resposta DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (prova_id) REFERENCES provas(id) ON DELETE CASCADE,
            FOREIGN KEY (questao_id) REFERENCES questoes(id) ON DELETE CASCADE
        )
    `);
    await db.exec(`
        CREATE TABLE IF NOT EXISTS notas (
            id TEXT PRIMARY KEY,
            prova_id TEXT NOT NULL,
            aluno_cpf TEXT NOT NULL,
            nota REAL NOT NULL,
            data_submissao DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (prova_id) REFERENCES provas(id) ON DELETE CASCADE
        )
    `);
    await db.exec(`
        CREATE TABLE IF NOT EXISTS links_unicos (
            id TEXT PRIMARY KEY,
            prova_id TEXT NOT NULL,
            aluno_cpf TEXT NOT NULL,
            link_unico TEXT NOT NULL,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            data_utilizacao DATETIME,
            utilizado INTEGER DEFAULT 0,
            FOREIGN KEY (prova_id) REFERENCES provas(id) ON DELETE CASCADE
        )
    `);
    await db.exec(`
        CREATE TABLE IF NOT EXISTS provas_alunos (
            prova_id TEXT NOT NULL,
            aluno_cpf TEXT NOT NULL,
            PRIMARY KEY (prova_id, aluno_cpf),
            FOREIGN KEY (prova_id) REFERENCES provas(id) ON DELETE CASCADE
        )
    `);
    console.log("✅ Tabelas verificadas/criadas com sucesso!");
}

async function migrateUsersFromJson() {
    const usuariosPath = path.join(__dirname, 'usuario.json');
    if (!fs.existsSync(usuariosPath)) {
        console.log('⚠️ Arquivo usuario.json não encontrado. Pulando migração.');
        return;
    }
    console.log('🚀 Iniciando migração de usuários do JSON para o banco...');
    const usuarios = JSON.parse(fs.readFileSync(usuariosPath, 'utf8'));
    let migrated = 0;
    for (const user of usuarios) {
        try {
            const existing = await db.get('SELECT id FROM usuarios WHERE cpf = ?', [user.cpf]);
            if (existing) continue;
            await db.run(`
                INSERT INTO usuarios (id, nome, cpf, senha, tipo, turma, data_cadastro)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                user.id || uuidv4(),
                user.nome,
                user.cpf,
                user.senha,
                user.tipo,
                user.turma || null,
                user.dataCadastro || new Date().toISOString()
            ]);
            migrated++;
            console.log(`✅ Migrou usuário: ${user.nome} (${user.cpf})`);
        } catch (error) {
            console.error(`❌ Erro ao migrar usuário ${user.nome}:`, error.message);
        }
    }
    console.log(`🎉 Migração concluída! ${migrated} usuários migrados.`);
    const backupPath = path.join(__dirname, 'usuario.json.bak');
    fs.renameSync(usuariosPath, backupPath);
    console.log(`📁 Arquivo original renomeado para: ${backupPath}`);
}

// ===== MIDDLEWARE DE AUTENTICAÇÃO =====
function checkAuth(req, res, next) {
    console.log("=== CHECK AUTH MIDDLEWARE ===");
    console.log("URL:", req.url);
    // Primeiro tenta pela sessão
    if (req.session && req.session.user) {
        console.log("Autenticado por sessão:", req.session.user);
        req.user = req.session.user;
        return next();
    }
    // Depois por JWT
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            console.log("Autenticado por token:", decoded);
            req.user = decoded;
            return next();
        } catch (error) {
            console.log("Token inválido:", error.message);
        }
    }
    // Rota pública?
    const publicRoutes = [
        "/", "/login", "/login/", "/cadastro", "/cadastro/",
        "/contato", "/politica", "/termos",
        "/api/auth/login", "/api/cadastro", "/api/test", "/health",
        "/api/status", "/api/debug/session", "/favicon.ico",
        "/css/", "/js/", "/images/", "/api/auth/check"
    ];
    const isPublicRoute = publicRoutes.some(
        (route) => req.path === route || req.path.startsWith(route)
    );
    if (isPublicRoute) {
        console.log("[AUTH] Rota pública, acesso permitido");
        return next();
    }
    if (req.path.startsWith("/api/")) {
        return res.status(401).json({ error: "Não autenticado", redirect: "/login/" });
    }
    res.redirect("/login/?error=Sessão expirada ou não autenticado");
}

function requireProfessorAuth(req, res, next) {
    if (!req.user || req.user.tipo !== "professor") {
        if (req.xhr || req.headers.accept?.includes("json")) {
            return res.status(401).json({
                error: "Acesso não autorizado",
                redirect: "/login/?error=Acesso restrito a professores"
            });
        }
        return res.redirect("/login/?error=Acesso restrito a professores");
    }
    next();
}

// ===== UTILITÁRIOS =====
function isValidCPF(cpf) {
    cpf = cpf.replace(/\D/g, "");
    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;
    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf[i-1]) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf[9])) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf[i-1]) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf[10])) return false;
    return true;
}

function batchInsert(table, columns, data, batchSize = 50) {
    return new Promise((resolve, reject) => {
        const batches = [];
        for (let i = 0; i < data.length; i += batchSize) {
            batches.push(data.slice(i, i + batchSize));
        }
        let processed = 0;
        const processBatch = async (batch) => {
            if (!batch || batch.length === 0) {
                resolve();
                return;
            }
            const placeholders = batch
                .map(() => `(${columns.map(() => "?").join(", ")})`)
                .join(", ");
            const values = batch.flat();
            const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders}`;
            try {
                await db.run(sql, values);
                processed += batch.length;
                console.log(`Inseridos ${processed}/${data.length} registros em ${table}`);
                setTimeout(() => processBatch(batches.shift()), 50);
            } catch (err) {
                reject(err);
            }
        };
        processBatch(batches.shift());
    });
}

// ===== SISTEMA DE FILA =====
const processingQueue = {
    tasks: [],
    isProcessing: false,
    add(task) {
        this.tasks.push(task);
        if (!this.isProcessing) this.process();
    },
    async process() {
        if (this.tasks.length === 0) {
            this.isProcessing = false;
            return;
        }
        this.isProcessing = true;
        const task = this.tasks.shift();
        try {
            await task();
        } catch (error) {
            console.error("Erro no processamento:", error);
        }
        setTimeout(() => this.process(), 100);
    },
};

// ===== ROTAS DA API =====
app.post("/api/cadastro", async (req, res) => {
    const { nome, cpf, senha, tipo, turma } = req.body;
    try {
        if (!nome || !cpf || !senha || !tipo) {
            return res.status(400).json({ success: false, message: "Todos os campos são obrigatórios" });
        }
        if (tipo === "aluno" && !turma) {
            return res.status(400).json({ success: false, message: "Turma é obrigatória para alunos" });
        }
        if (!isValidCPF(cpf)) {
            return res.status(400).json({ success: false, message: "CPF inválido" });
        }
        const existingUser = await db.get(`SELECT id FROM usuarios WHERE cpf = ?`, [cpf]);
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Usuário já cadastrado com este CPF" });
        }
        await db.run(`
            INSERT INTO usuarios (id, nome, cpf, senha, tipo, turma, data_cadastro)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            uuidv4(),
            nome,
            cpf,
            senha,
            tipo,
            tipo === "aluno" ? turma : null,
            new Date().toISOString()
        ]);
        res.json({ success: true, message: "Usuário cadastrado com sucesso!" });
    } catch (error) {
        console.error("Erro ao cadastrar usuário:", error);
        res.status(500).json({ success: false, message: "Erro interno do servidor: " + error.message });
    }
});

app.post("/api/auth/login", async (req, res) => {
    const { cpf, senha, tipo, turma } = req.body;
    try {
        if (!cpf || !senha || !tipo) {
            return res.status(400).json({ success: false, message: "Todos os campos são obrigatórios" });
        }
        const usuario = await db.get(`SELECT * FROM usuarios WHERE cpf = ? AND tipo = ?`, [cpf, tipo]);
        if (!usuario) {
            return res.status(401).json({ success: false, message: "Usuário não encontrado" });
        }
        if (usuario.senha !== senha) {
            return res.status(401).json({ success: false, message: "Senha incorreta" });
        }
        if (tipo === "aluno" && usuario.turma !== turma) {
            return res.status(401).json({ success: false, message: `Turma incorreta. Sua turma é ${usuario.turma}.` });
        }
        const userPayload = {
            id: usuario.id,
            nome: usuario.nome,
            cpf: usuario.cpf,
            tipo: usuario.tipo,
            turma: usuario.turma,
        };
        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });
        req.session.regenerate((err) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Erro interno do servidor" });
            }
            req.session.user = userPayload;
            req.session.save((err) => {
                if (err) {
                    return res.status(500).json({ success: false, message: "Erro interno do servidor" });
                }
                res.json({
                    success: true,
                    message: "Login realizado com sucesso!",
                    user: userPayload,
                    token: token,
                    redirectUrl: "/url",
                });
            });
        });
    } catch (error) {
        console.error("ERRO CRÍTICO NO LOGIN:", error);
        res.status(500).json({ success: false, message: "Erro interno do servidor: " + error.message });
    }
});

app.get("/api/auth/check", (req, res) => {
    if (req.session && req.session.user) {
        res.json({ isAuthenticated: true, user: req.session.user });
    } else {
        res.status(401).json({ isAuthenticated: false, message: "Não autenticado" });
    }
});

app.get('/api/user/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const usuario = await db.get(`SELECT * FROM usuarios WHERE id = ?`, [userId]);
        if (!usuario) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        res.json(usuario);
    } catch (error) {
        console.error('Erro ao buscar usuário por ID:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: "Erro ao fazer logout" });
        }
        res.json({ success: true, message: "Logout realizado com sucesso" });
    });
});

app.get("/api/debug/session", (req, res) => {
    res.json({
        sessionID: req.sessionID,
        session: req.session,
        user: req.session?.user,
        headers: req.headers,
        cookies: req.cookies,
        activeSessions: Array.from(activeSessions.entries()),
    });
});

app.get("/api/professor/dashboard", checkAuth, (req, res) => {
    try {
        if (!req.user || !req.user.tipo) {
            return res.status(401).json({ success: false, message: 'Dados de usuário inválidos' });
        }
        if (req.user.tipo !== "professor") {
            return res.status(403).json({ success: false, message: 'Acesso restrito a professores' });
        }
        res.json({ success: true, message: 'Dashboard do professor', data: req.user });
    } catch (error) {
        console.error('Erro no dashboard do professor:', error);
        res.status(500).json({ success: false, message: 'Erro interno no servidor' });
    }
});

app.get("/api/exams/:examId/attempt/:studentCpf", async (req, res) => {
    try {
        const { examId, studentCpf } = req.params;
        const row = await db.get(`SELECT COUNT(*) as count FROM respostas WHERE prova_id = ? AND aluno_cpf = ?`, [examId, studentCpf]);
        res.json({ attempted: row.count > 0 });
    } catch (err) {
        console.error("Erro ao verificar tentativa:", err);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

app.get("/api/exams", async (req, res) => {
    try {
        const rows = await db.all("SELECT * FROM provas ORDER BY data_criacao DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/exams/:id", async (req, res) => {
    try {
        const examId = req.params.id;
        const exam = await db.get("SELECT * FROM provas WHERE id = ?", [examId]);
        if (!exam) {
            return res.status(404).json({ error: "Prova não encontrada" });
        }
        const questions = await db.all("SELECT * FROM questoes WHERE prova_id = ?", [examId]);
        const questionsWithAlternatives = [];
        if (questions.length === 0) {
            return res.json({ ...exam, questions: [] });
        }
        for (const question of questions) {
            const alternatives = await db.all("SELECT * FROM alternativas WHERE questao_id = ?", [question.id]);
            questionsWithAlternatives.push({ ...question, alternatives: alternatives || [] });
        }
        res.json({ ...exam, questions: questionsWithAlternatives });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/gerar-link-unico", async (req, res) => {
    const { prova_id, aluno_cpf } = req.body;
    try {
        const usuario = await db.get(`SELECT id FROM usuarios WHERE cpf = ?`, [aluno_cpf]);
        if (!usuario) {
            return res.status(404).json({ error: "Aluno não encontrado" });
        }
        const aluno_id = usuario.id;
        const row = await db.get(`SELECT * FROM links_unicos WHERE prova_id = ? AND aluno_cpf = ?`, [prova_id, aluno_cpf]);
        if (row) {
            return res.json({
                link_unico: row.link_unico,
                url_acesso: `http://localhost:3000/acesso-unico/${row.link_unico}`,
                message: "Link único já existente",
            });
        } else {
            const linkUnico = `${aluno_id}-${uuidv4()}`;
            await db.run(`INSERT INTO links_unicos (prova_id, aluno_cpf, link_unico, data_criacao) VALUES (?, ?, ?, datetime('now'))`, [prova_id, aluno_cpf, linkUnico]);
            res.json({
                link_unico: linkUnico,
                url_acesso: `http://localhost:3000/acesso-unico/${linkUnico}`,
                message: "Link único gerado com sucesso!",
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/provas", requireProfessorAuth, async (req, res) => {
    const { titulo, disciplina, data_limite, tempo_limite, descricao, questões, alunos } = req.body;
    const provaId = uuidv4();
    try {
        await new Promise((resolve, reject) => {
            db.run(`INSERT INTO provas (id, titulo, disciplina, professor_cpf, data_limite, tempo_limite, descricao) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
                provaId, titulo, disciplina, "professor_cpf_aqui", data_limite, tempo_limite, descricao
            ], function (err) {
                if (err) reject(err);
                else resolve();
            });
        });
        res.json({ id: provaId, message: "Prova criada com sucesso! Processamento em segundo plano iniciado." });
        processingQueue.add(async () => {
            try {
                if (questões && questões.length > 0) {
                    const questaoData = [];
                    const alternativaData = [];
                    questões.forEach((questao, index) => {
                        const questaoId = uuidv4();
                        questaoData.push([questaoId, provaId, questao.tipo, questao.enunciado, questao.valor || 1.0, index]);
                        if (questao.tipo === "multipla_escolha" && questao.alternativas) {
                            questao.alternativas.forEach((alt, altIndex) => {
                                alternativaData.push([uuidv4(), questaoId, alt.texto, alt.correta ? 1 : 0, altIndex]);
                            });
                        } else if (questao.tipo === "verdadeiro_falso") {
                            alternativaData.push([uuidv4(), questaoId, "Verdadeiro", questao.resposta_correta === "verdadeiro" ? 1 : 0, 0]);
                            alternativaData.push([uuidv4(), questaoId, "Falso", questao.resposta_correta === "falso" ? 1 : 0, 1]);
                        }
                    });
                    await batchInsert("questoes", ["id", "prova_id", "tipo", "enunciado", "valor", "ordem"], questaoData);
                    if (alternativaData.length > 0) {
                        await batchInsert("alternativas", ["id", "questao_id", "texto", "correta", "ordem"], alternativaData);
                    }
                }
                if (alunos && alunos.length > 0) {
                    const alunoData = alunos.map((cpf) => [provaId, cpf]);
                    await batchInsert("provas_alunos", ["prova_id", "aluno_cpf"], alunoData);
                }
                console.log(`Prova ${provaId} processada completamente em segundo plano`);
            } catch (error) {
                console.error("Erro no processamento em segundo plano:", error);
            }
        });
    } catch (error) {
        console.error("Erro ao criar prova:", error);
        res.status(500).json({ error: "Erro ao criar prova" });
    }
});

app.post("/api/salvar-prova", async (req, res) => {
    const { title, description, duration, exam_date, questions } = req.body;
    try {
        if (!title || !duration || !exam_date) {
            return res.status(400).json({ success: false, message: "Título, duração e data são obrigatórios" });
        }
        const [day, month, year] = exam_date.split("/");
        const isoDate = `${year}-${month}-${day}`;
        const provaId = uuidv4();
        await db.run(`INSERT INTO provas (id, titulo, disciplina, professor_cpf, data_limite, tempo_limite, descricao) VALUES (?, ?, ?, ?, ?, ?, ?)`, [
            provaId, title, "Geral", "professor_cpf_aqui", isoDate, duration, description || ""
        ]);
        if (questions && questions.length > 0) {
            for (const [index, question] of questions.entries()) {
                const questaoId = uuidv4();
                await db.run(`INSERT INTO questoes (id, prova_id, tipo, enunciado, valor, ordem) VALUES (?, ?, ?, ?, ?, ?)`, [
                    questaoId, provaId, question.type, question.text, question.value || 1.0, index
                ]);
                if ((question.type === "multipla_escolha" || question.type === "verdadeiro_falso") && question.alternatives) {
                    for (const [altIndex, alternative] of question.alternatives.entries()) {
                        const isCorrect = question.type === "verdadeiro_falso"
                            ? alternative === question.correctAnswer
                            : altIndex === question.correctAnswer;
                        await db.run(`INSERT INTO alternativas (id, questao_id, texto, correta, ordem) VALUES (?, ?, ?, ?, ?)`, [
                            uuidv4(), questaoId, alternative, isCorrect ? 1 : 0, altIndex
                        ]);
                    }
                }
            }
        }
        res.json({ success: true, message: "Prova salva com sucesso!", examId: provaId });
    } catch (error) {
        console.error("Erro ao salvar prova:", error);
        res.status(500).json({ success: false, message: "Erro interno do servidor: " + error.message });
    }
});

app.post("/api/exams/:examId/submit", async (req, res) => {
    const examId = req.params.id;
    const { studentCpf, answers } = req.body;
    try {
        const row = await db.get(`SELECT COUNT(*) as count FROM respostas WHERE prova_id = ? AND aluno_cpf = ?`, [examId, studentCpf]);
        if (row.count > 0) {
            return res.status(400).json({ error: "Você já realizou esta prova" });
        }
        for (const answer of answers) {
            await db.run(`INSERT INTO respostas (id, prova_id, aluno_cpf, questao_id, resposta, correta) VALUES (?, ?, ?, ?, ?, ?)`, [
                uuidv4(), examId, studentCpf, answer.questionId, answer.answer, answer.isCorrect ? 1 : 0
            ]);
        }
        const rows = await db.all(`SELECT correta FROM respostas WHERE prova_id = ? AND aluno_cpf = ?`, [examId, studentCpf]);
        const total = rows.length;
        const corretas = rows.filter((row) => row.correta === 1).length;
        const nota = total > 0 ? ((corretas / total) * 10).toFixed(2) : 0;
        await db.run(`INSERT INTO notas (id, prova_id, aluno_cpf, nota, data_submissao) VALUES (?, ?, ?, ?, datetime('now'))`, [
            uuidv4(), examId, studentCpf, nota
        ]);
        res.json({ success: true, message: "Prova submetida com sucesso!", nota: nota });
    } catch (err) {
        console.error("Erro ao salvar respostas:", err);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

app.post("/api/usuarios/login", async (req, res) => {
    const { cpf, senha, tipo, turma } = req.body;
    try {
        const row = await db.get(`SELECT * FROM usuarios WHERE cpf = ? AND tipo = ?`, [cpf, tipo]);
        if (!row) {
            return res.json({ success: false, message: "Usuário não encontrado" });
        }
        if (row.senha !== senha) {
            return res.json({ success: false, message: "Senha incorreta" });
        }
        if (row.turma !== turma) {
            return res.json({ success: false, message: "Turma incorreta" });
        }
        res.json({ success: true, usuario: { nome: row.nome, cpf: row.cpf, tipo: row.tipo, turma: row.turma } });
    } catch (err) {
        return res.json({ success: false, message: "Erro no servidor" });
    }
});

app.post("/api/usuarios/cadastrar", async (req, res) => {
    const { nome, cpf, senha, tipo, turma } = req.body;
    try {
        const row = await db.get(`SELECT id FROM usuarios WHERE cpf = ?`, [cpf]);
        if (row) {
            return res.json({ success: false, message: "CPF já cadastrado" });
        }
        const id = crypto.randomBytes(16).toString("hex");
        await db.run(`INSERT INTO usuarios (id, nome, cpf, senha, tipo, turma, data_cadastro) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`, [
            id, nome, cpf, senha, tipo, turma
        ]);
        res.json({ success: true, message: "Usuário criado com sucesso", usuario: { nome, cpf, tipo, turma } });
    } catch (err) {
        return res.json({ success: false, message: "Erro ao criar usuário" });
    }
});

app.get("/api/auth/status", (req, res) => {
    if (req.session && req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

// ===== ROTAS DE PÁGINAS HTML PROTEGIDAS =====

// Login e públicas
app.get(["/", "/login", "/login/", "/login.html", "/aluno/login", "/aluno/login.html", "/professor/login", "/professor/login.html"], (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/login/login.html"));
});

// Cadastro e institucionais
app.get(["/cadastro", "/cadastro/"], (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/cadastro/cadastro.html"));
});
app.get("/contato", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/contato/contato.html"));
});
app.get("/politica", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/politica/politica.html"));
});
app.get("/termos", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/termos/termos.html"));
});

// Área do aluno via URL única
app.get('/aluno/:alunoId', async (req, res) => {
    try {
        const { alunoId } = req.params;
        const aluno = await db.get(`SELECT * FROM usuarios WHERE id = ? AND tipo = 'aluno'`, [alunoId]);
        if (!aluno) return res.status(404).send('Aluno não encontrado');
        if (req.session.user && req.session.user.id === alunoId) {
            return res.sendFile(path.join(__dirname, '../frontend/aluno/aluno.html'));
        }
        res.redirect(`/login/?redirect=/aluno/${alunoId}&message=Faça login para acessar sua área exclusiva`);
    } catch (error) {
        console.error('Erro na rota do aluno:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// Área do professor via URL única
app.get('/professor/:professorId', async (req, res) => {
    try {
        const { professorId } = req.params;
        const professor = await db.get(`SELECT * FROM usuarios WHERE id = ? AND tipo = 'professor'`, [professorId]);
        if (!professor) return res.status(404).send('Professor não encontrado');
        if (req.session.user && req.session.user.id === professorId) {
            return res.sendFile(path.join(__dirname, '../frontend/professor/professor.html'));
        }
        res.redirect(`/login/?redirect=/professor/${professorId}&message=Faça login para acessar sua área exclusiva`);
    } catch (error) {
        console.error('Erro na rota do professor:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// Página de URL única (pós-login)
app.get('/url', checkAuth, (req, res) => {
    if (!req.user || (req.user.tipo !== 'aluno' && req.user.tipo !== 'professor')) {
        return res.redirect('/login/?error=Acesso restrito a alunos ou professores');
    }
    const filePath = path.join(__dirname, '../frontend/UrlUnico/url.html');
    if (!fs.existsSync(filePath)) {
        return res.status(500).send('Erro: Página de URL única não encontrada.');
    }
    res.sendFile(filePath);
});

// Rotas do Aluno
app.get(["/aluno", "/aluno/dashboard", "/aluno/aluno.html", "/aluno/acesso", "/aluno/acesso/"], checkAuth, (req, res) => {
    if (req.user.tipo !== "aluno") {
        return res.redirect("/login/?error=Acesso restrito a alunos");
    }
    res.sendFile(path.join(__dirname, "../frontend/aluno/aluno.html"));
});

app.get(["/aluno/acesso/provas", "/aluno/acesso/provas.html", "/provas", "/provas.html"], checkAuth, (req, res) => {
    if (req.user.tipo !== "aluno") {
        return res.redirect("/login/?error=Acesso restrito a alunos");
    }
    res.sendFile(path.join(__dirname, "../frontend/aluno/acesso/provas.html"));
});

// Rotas do Professor
app.get(["/professor", "/professor.html", "/professor/dashboard", "/professor/professor.html"], checkAuth, (req, res) => {
    if (req.user.tipo !== "professor") {
        return res.redirect("/login/?error=Acesso restrito a professores");
    }
    res.sendFile(path.join(__dirname, "../frontend/professor/professor.html"));
});

app.get(["/professor/criar", "/professor/criarprova", "/professor/criarprova.html", "/criarprova.html"], checkAuth, (req, res) => {
    if (req.user.tipo !== "professor") {
        return res.redirect("/login/?error=Acesso restrito a professores");
    }
    res.sendFile(path.join(__dirname, "../frontend/professor/criar/criarprova.html"));
});

app.get(["/professor/gerenciar", "/professor/gerenciar.html"], checkAuth, (req, res) => {
    if (req.user.tipo !== "professor") {
        return res.redirect("/login/?error=Acesso restrito a professores");
    }
    res.sendFile(path.join(__dirname, "../frontend/professor/gerenciar/gerenciar.html"));
});

app.get(["/professor/resultados", "/professor/resultados.html"], checkAuth, (req, res) => {
    if (req.user.tipo !== "professor") {
        return res.redirect("/login/?error=Acesso restrito a professores");
    }
    res.sendFile(path.join(__dirname, "../frontend/professor/resultados/resultados.html"));
});

// ⚠️ ⚠️ ⚠️ IMPORTANTE: STATIC DEVE VIR DEPOIS DE TODAS AS ROTAS PROTEGIDAS ⚠️ ⚠️ ⚠️
// ===== SERVIÇO DE ARQUIVOS ESTÁTICOS =====
app.use(express.static(path.join(__dirname, "../frontend")));

// Rota fallback para HTML
app.get("*.html", (req, res) => {
    const filePath = path.join(__dirname, "../frontend", req.path);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send("Página não encontrada");
    }
});

// Rotas de saúde
app.get("/api/status", (req, res) => {
    res.json({ status: "online", message: "Servidor PROVA-ONLINE está funcionando!", timestamp: new Date().toISOString() });
});
app.get("/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Manipuladores de erro
app.use((req, res) => {
    res.status(404).json({ error: "Rota não encontrada", path: req.path });
});
app.use((err, req, res, next) => {
    console.error("[ERRO] Erro interno:", err.stack);
    res.status(500).json({ error: "Erro interno do servidor", message: err.message });
});

// Inicialização
initializeDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log("🎓 PROVA-ONLINE rodando!");
            console.log(`📍 http://localhost:${PORT}`);
            console.log("✅ Login com CPF 12345678901 / senha123 como professor");
        });
    })
    .catch((err) => {
        console.error("Falha ao inicializar o banco de dados:", err);
    });