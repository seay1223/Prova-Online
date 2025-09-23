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
const PORT = process.env.PORT || 3000; // Usar porta do .env ou default 3000

console.log('✅ Ambiente:', process.env.NODE_ENV || 'development');
console.log('✅ Porta do servidor:', process.env.PORT || 3000);

// Inicializar o banco de dados
let db;
async function initializeDatabase() {
    try {
        // Garantir que o diretório do banco de dados existe
        const dbDir = path.join(__dirname, "database");
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        db = await open({
            filename: path.join(dbDir, "database.db"),
            driver: sqlite3.Database,
        });
        console.log("✅ Banco de dados conectado com sucesso!");
        // Criar tabelas se não existirem
        await createTables();
        
        // ===== FUNÇÃO PARA MIGRAR USUÁRIOS DO JSON PARA O BANCO =====
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
                    // Verifica se já existe no banco
                    const existing = await db.get('SELECT id FROM usuarios WHERE cpf = ?', [user.cpf]);
                    if (existing) {
                        console.log(`🔁 Usuário ${user.nome} (CPF: ${user.cpf}) já existe no banco.`);
                        continue;
                    }

                    // Insere no banco
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

            // OPCIONAL: Renomear o arquivo JSON para backup
            const backupPath = path.join(__dirname, 'usuario.json.bak');
            fs.renameSync(usuariosPath, backupPath);
            console.log(`📁 Arquivo original renomeado para: ${backupPath}`);
        }
        
        // Chamar a função de migração após criar as tabelas
        await migrateUsersFromJson();
        
        // Verificar se existem usuários no banco
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
        process.exit(1); // Encerra o processo se não conseguir conectar ao banco
    }
}

async function createTables() {
    // Criar tabela de usuários
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
    // Criar tabela de provas
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
    // Criar tabela de questões
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
    // Criar tabela de alternativas
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
    // Criar tabela de respostas
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
    // Criar tabela de notas
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
    // Criar tabela de links únicos
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
    // Criar tabela de provas_alunos
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

// ===== MIDDLEWARES =====
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

// Sistema de limpeza de sessões em memória
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

// Limpar sessões expiradas a cada hora
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

// Middleware para garantir que a sessão seja salva
app.use((req, res, next) => {
    if (!req.session) {
        return next(new Error("Session not available"));
    }
    next();
});

// Middleware para debug de sessões - MELHORADO
app.use((req, res, next) => {
    console.log("=== SESSION DEBUG ===");
    console.log("URL:", req.url);
    console.log("Method:", req.method);
    console.log("Session ID:", req.sessionID);
    console.log("Session data:", JSON.stringify(req.session, null, 2));
    console.log("User in session:", req.session?.user);
    console.log("Authorization Header:", req.headers.authorization);
    console.log("=========================");
    next();
});

// Middleware de logging detalhado
app.use((req, res, next) => {
    console.log(`[DEBUG] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ===== SERVIÇO DE ARQUIVOS ESTÁTICOS =====
// Servir todos os arquivos estáticos da pasta frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// ===== MIDDLEWARE DE AUTENTICAÇÃO - CORRIGIDO COM JWT =====
function checkAuth(req, res, next) {
    console.log("=== CHECK AUTH MIDDLEWARE ===");
    console.log("Session:", req.session);
    console.log("Headers:", req.headers);
    
    // Primeiro tenta pela sessão (compatibilidade)
    if (req.session && req.session.user) {
        console.log("Autenticado por sessão:", req.session.user);
        req.user = req.session.user;
        return next();
    }
    
    // Se não tem sessão, tenta por token JWT no header
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
    
    // Se nenhum método funcionou
    console.log("Usuário não autenticado");
    
    const publicRoutes = [
        "/",
        "/login",
        "/login/",
        "/cadastro",
        "/cadastro/",
        "/contato",
        "/politica",
        "/termos",
        "/api/auth/login",
        "/api/cadastro",
        "/api/test",
        "/health",
        "/api/status",
        "/api/debug/session",
        "/favicon.ico",
        "/css/",
        "/js/",
        "/images/",
        "/api/auth/check",
    ];

    const isPublicRoute = publicRoutes.some(
        (route) => req.path === route || req.path.startsWith(route)
    );

    if (isPublicRoute) {
        console.log("[AUTH] Rota pública, acesso permitido");
        return next();
    }

    if (req.path.startsWith("/api/")) {
        return res.status(401).json({
            error: "Não autenticado",
            redirect: "/login/",
        });
    }

    res.redirect("/login/?error=Sessão expirada ou não autenticado");
}

// Middleware para verificar se usuário está autenticado como professor
function requireProfessorAuth(req, res, next) {
    console.log("[AUTH] Verificando autenticação para professor...");
    if (!req.session && !req.headers.authorization) {
        console.log("[AUTH] Nenhuma sessão ou token encontrado");
        return res.redirect("/login/?error=Sessão não encontrada");
    }
    
    // Verificar se é professor
    if (req.user && req.user.tipo === "professor") {
        console.log("[AUTH] Autenticação bem-sucedida para professor");
        next();
    } else {
        console.log(
            "[AUTH] Falha na autenticação. Tipo de usuário:",
            req.user ? req.user.tipo : "Não definido"
        );
        if (req.xhr || req.headers.accept.indexOf("json") > -1) {
            return res.status(401).json({
                error: "Acesso não autorizado",
                redirect: "/login/?error=Acesso restrito a professores",
            });
        }
        res.redirect("/login/?error=Acesso restrito a professores");
    }
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

// ===== FUNÇÕES UTILITÁRIAS =====
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
            const sql = `INSERT INTO ${table} (${columns.join(
                ", "
            )}) VALUES ${placeholders}`;
            try {
                await db.run(sql, values);
                processed += batch.length;
                console.log(
                    `Inseridos ${processed}/${data.length} registros em ${table}`
                );
                setTimeout(() => processBatch(batches.shift()), 50);
            } catch (err) {
                reject(err);
            }
        };
        processBatch(batches.shift());
    });
}

function isValidCPF(cpf) {
    cpf = cpf.replace(/\D/g, "");
    if (cpf.length !== 11) return false;
    if (/^(\d)\1+$/.test(cpf)) return false;
    let soma = 0;
    let resto;
    for (let i = 1; i <= 9; i++)
        soma = soma + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++)
        soma = soma + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    return true;
}

// ===== ROTAS DA API =====
app.post("/api/cadastro", async (req, res) => {
    const { nome, cpf, senha, tipo, turma } = req.body;
    console.log("=== TENTATIVA DE CADASTRO ===");
    try {
        if (!nome || !cpf || !senha || !tipo) {
            return res.status(400).json({
                success: false,
                message: "Todos os campos são obrigatórios",
            });
        }
        if (tipo === "aluno" && !turma) {
            return res.status(400).json({
                success: false,
                message: "Turma é obrigatória para alunos",
            });
        }
        if (!isValidCPF(cpf)) {
            return res.status(400).json({
                success: false,
                message: "CPF inválido",
            });
        }
        
        // Verificar se CPF já existe no banco
        const existingUser = await db.get(
            `SELECT id FROM usuarios WHERE cpf = ?`,
            [cpf]
        );
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Usuário já cadastrado com este CPF",
            });
        }

        // Inserir novo usuário
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
        
        console.log("Usuário cadastrado com sucesso:", nome);
        res.json({
            success: true,
            message: "Usuário cadastrado com sucesso!",
        });
    } catch (error) {
        console.error("Erro ao cadastrar usuário:", error);
        res.status(500).json({
            success: false,
            message: "Erro interno do servidor: " + error.message,
        });
    }
});

// ===== ENDPOINT DE LOGIN CORRIGIDO COM GERAÇÃO DE TOKEN JWT =====
app.post("/api/auth/login", async (req, res) => {
    console.log("=== TENTATIVA DE LOGIN RECEBIDA ===");
    try {
        const { cpf, senha, tipo, turma } = req.body;
        console.log("Dados de login recebidos:", { cpf, tipo, turma });
        
        if (!cpf || !senha || !tipo) {
            console.log("Dados incompletos");
            return res.status(400).json({
                success: false,
                message: "Todos os campos são obrigatórios",
            });
        }
        
        // Consulta direta no banco
        const usuario = await db.get(
            `SELECT * FROM usuarios WHERE cpf = ? AND tipo = ?`,
            [cpf, tipo]
        );
        
        if (!usuario) {
            console.log("Usuário não encontrado para CPF:", cpf, "e tipo:", tipo);
            return res.status(401).json({
                success: false,
                message: "Usuário não encontrado",
            });
        }
        
        console.log("Usuário encontrado:", usuario.nome);
        
        if (usuario.senha !== senha) {
            console.log("Senha incorreta para usuário:", usuario.nome);
            return res.status(401).json({
                success: false,
                message: "Senha incorreta",
            });
        }
        
        if (tipo === "aluno" && usuario.turma !== turma) {
            console.log(
                "Turma incorreta. Esperada:",
                usuario.turma,
                "Recebida:",
                turma
            );
            return res.status(401).json({
                success: false,
                message: `Turma incorreta. Sua turma é ${usuario.turma}.`,
            });
        }
        
        const userPayload = {
            id: usuario.id,
            nome: usuario.nome,
            cpf: usuario.cpf,
            tipo: usuario.tipo,
            turma: usuario.turma,
        };
        
        console.log("Criando sessão para usuário:", userPayload);
        
        // Gerar token JWT
        const token = jwt.sign(userPayload, JWT_SECRET, { 
            expiresIn: '24h' 
        });
        
        req.session.regenerate((err) => {
            if (err) {
                console.error("Erro ao regenerar sessão:", err);
                return res.status(500).json({
                    success: false,
                    message: "Erro interno do servidor",
                });
            }
            
            req.session.user = userPayload;
            console.log("Sessão criada com sucesso para:", userPayload.nome);
            
            req.session.save((err) => {
                if (err) {
                    console.error("Erro ao salvar sessão:", err);
                    return res.status(500).json({
                        success: false,
                        message: "Erro interno do servidor",
                    });
                }
                
                console.log("Sessão salva com sucesso. Enviando resposta com token JWT.");
                
                res.json({
                    success: true,
                    message: "Login realizado com sucesso!",
                    user: userPayload,
                    token: token, // Incluindo o token na resposta
                    redirectUrl: "/url", // 👈 AGORA TANTO ALUNO QUANTO PROFESSOR VÃO PARA A MESMA PÁGINA
                });
            });
        });
    } catch (error) {
        console.error("ERRO CRÍTICO NO LOGIN:", error);
        res.status(500).json({
            success: false,
            message: "Erro interno do servidor: " + error.message,
        });
    }
});

app.get("/api/auth/check", (req, res) => {
    console.log("🔍 Verificando autenticação para sessão:", req.sessionID);
    if (req.session && req.session.user) {
        console.log("✅ Usuário autenticado:", req.session.user.nome);
        res.json({
            isAuthenticated: true,
            user: req.session.user,
        });
    } else {
        console.log("❌ Não autenticado");
        res.status(401).json({
            isAuthenticated: false,
            message: "Não autenticado",
        });
    }
});

// Endpoint para buscar usuário por ID (para uso em url.js como fallback)
app.get('/api/user/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        
        const usuario = await db.get(
            `SELECT * FROM usuarios WHERE id = ?`,
            [userId]
        );
        
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
            console.error("Erro ao fazer logout:", err);
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

// Rota para o dashboard do professor com verificação de token
app.get("/api/professor/dashboard", checkAuth, (req, res) => {
    try {
        // VERIFICAÇÃO DE SEGURANÇA ADICIONADA
        if (!req.user || !req.user.tipo) {
            console.error("Usuário não definido na requisição:", req.user);
            return res.status(401).json({ 
                success: false, 
                message: 'Dados de usuário inválidos' 
            });
        }

        // Verifica se é professor
        if (req.user.tipo !== "professor") {
            return res.status(403).json({ 
                success: false, 
                message: 'Acesso restrito a professores' 
            });
        }

        // Resto do código do dashboard...
        res.json({ 
            success: true, 
            message: 'Dashboard do professor',
            data: req.user 
        });
        
    } catch (error) {
        console.error('Erro no dashboard do professor:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno no servidor' 
        });
    }
});

app.get("/api/exams/:examId/attempt/:studentCpf", async (req, res) => {
    try {
        const { examId, studentCpf } = req.params;
        const row = await db.get(
            `SELECT COUNT(*) as count FROM respostas 
             WHERE prova_id = ? AND aluno_cpf = ?`,
            [examId, studentCpf]
        );
        res.json({ attempted: row.count > 0 });
    } catch (err) {
        console.error("Erro ao verificar tentativa:", err);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

app.get("/api/exams", async (req, res) => {
    try {
        const rows = await db.all(
            "SELECT * FROM provas ORDER BY data_criacao DESC"
        );
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
        const questions = await db.all(
            "SELECT * FROM questoes WHERE prova_id = ?",
            [examId]
        );
        const questionsWithAlternatives = [];
        if (questions.length === 0) {
            return res.json({ ...exam, questions: [] });
        }
        for (const question of questions) {
            const alternatives = await db.all(
                "SELECT * FROM alternativas WHERE questao_id = ?",
                [question.id]
            );
            questionsWithAlternatives.push({
                ...question,
                alternatives: alternatives || [],
            });
        }
        res.json({ ...exam, questions: questionsWithAlternatives });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/gerar-link-unico", async (req, res) => {
    const { prova_id, aluno_cpf } = req.body;

    try {
        // Encontrar o usuário pelo CPF no banco
        const usuario = await db.get(
            `SELECT id FROM usuarios WHERE cpf = ?`,
            [aluno_cpf]
        );
        
        if (!usuario) {
            return res.status(404).json({ error: "Aluno não encontrado" });
        }

        const aluno_id = usuario.id;

        const row = await db.get(
            `SELECT * FROM links_unicos WHERE prova_id = ? AND aluno_cpf = ?`,
            [prova_id, aluno_cpf]
        );

        if (row) {
            return res.json({
                link_unico: row.link_unico,
                url_acesso: `http://localhost:3000/acesso-unico/${row.link_unico}`,
                message: "Link único já existente",
            });
        } else {
            // Criar link único usando o ID do aluno + UUID
            const linkUnico = `${aluno_id}-${uuidv4()}`;

            await db.run(
                `INSERT INTO links_unicos (prova_id, aluno_cpf, link_unico, data_criacao) VALUES (?, ?, ?, datetime('now'))`,
                [prova_id, aluno_cpf, linkUnico]
            );

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
    const {
        titulo,
        disciplina,
        data_limite,
        tempo_limite,
        descricao,
        questões,
        alunos,
    } = req.body;
    const provaId = uuidv4();
    try {
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO provas (id, titulo, disciplina, professor_cpf, data_limite, tempo_limite, descricao) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    provaId,
                    titulo,
                    disciplina,
                    "professor_cpf_aqui",
                    data_limite,
                    tempo_limite,
                    descricao,
                ],
                function (err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        res.json({
            id: provaId,
            message:
                "Prova criada com sucesso! Processamento em segundo plano iniciado.",
        });
        processingQueue.add(async () => {
            try {
                if (questões && questões.length > 0) {
                    const questaoData = [];
                    const alternativaData = [];
                    questões.forEach((questao, index) => {
                        const questaoId = uuidv4();
                        questaoData.push([
                            questaoId,
                            provaId,
                            questao.tipo,
                            questao.enunciado,
                            questao.valor || 1.0,
                            index,
                        ]);
                        if (questao.tipo === "multipla_escolha" && questao.alternativas) {
                            questao.alternativas.forEach((alt, altIndex) => {
                                alternativaData.push([
                                    uuidv4(),
                                    questaoId,
                                    alt.texto,
                                    alt.correta ? 1 : 0,
                                    altIndex,
                                ]);
                            });
                        } else if (questao.tipo === "verdadeiro_falso") {
                            alternativaData.push([
                                uuidv4(),
                                questaoId,
                                "Verdadeiro",
                                questao.resposta_correta === "verdadeiro" ? 1 : 0,
                                0,
                            ]);
                            alternativaData.push([
                                uuidv4(),
                                questaoId,
                                "Falso",
                                questao.resposta_correta === "falso" ? 1 : 0,
                                1,
                            ]);
                        }
                    });
                    await batchInsert(
                        "questoes",
                        ["id", "prova_id", "tipo", "enunciado", "valor", "ordem"],
                        questaoData
                    );
                    if (alternativaData.length > 0) {
                        await batchInsert(
                            "alternativas",
                            ["id", "questao_id", "texto", "correta", "ordem"],
                            alternativaData
                        );
                    }
                }
                if (alunos && alunos.length > 0) {
                    const alunoData = alunos.map((cpf) => [provaId, cpf]);
                    await batchInsert(
                        "provas_alunos",
                        ["prova_id", "aluno_cpf"],
                        alunoData
                    );
                }
                console.log(
                    `Prova ${provaId} processada completamente em segundo plano`
                );
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
    console.log("Recebendo dados da prova:", {
        title,
        description,
        duration,
        exam_date,
        questions,
    });
    try {
        if (!title || !duration || !exam_date) {
            return res.status(400).json({
                success: false,
                message: "Título, duração e data são obrigatórios",
            });
        }
        const [day, month, year] = exam_date.split("/");
        const isoDate = `${year}-${month}-${day}`;
        const provaId = uuidv4();
        await db.run(
            `INSERT INTO provas (id, titulo, disciplina, professor_cpf, data_limite, tempo_limite, descricao) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                provaId,
                title,
                "Geral",
                "professor_cpf_aqui",
                isoDate,
                duration,
                description || "",
            ]
        );
        if (questions && questions.length > 0) {
            for (const [index, question] of questions.entries()) {
                const questaoId = uuidv4();
                await db.run(
                    `INSERT INTO questoes (id, prova_id, tipo, enunciado, valor, ordem) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [
                        questaoId,
                        provaId,
                        question.type,
                        question.text,
                        question.value || 1.0,
                        index,
                    ]
                );
                if (
                    (question.type === "multipla_escolha" ||
                        question.type === "verdadeiro_falso") &&
                    question.alternatives
                ) {
                    for (const [
                        altIndex,
                        alternative,
                    ] of question.alternatives.entries()) {
                        const isCorrect =
                            question.type === "verdadeiro_falso"
                                ? alternative === question.correctAnswer
                                : altIndex === question.correctAnswer;
                        await db.run(
                            `INSERT INTO alternativas (id, questao_id, texto, correta, ordem) 
                             VALUES (?, ?, ?, ?, ?)`,
                            [uuidv4(), questaoId, alternative, isCorrect ? 1 : 0, altIndex]
                        );
                    }
                }
            }
        }
        res.json({
            success: true,
            message: "Prova salva com sucesso!",
            examId: provaId,
        });
    } catch (error) {
        console.error("Erro ao salvar prova:", error);
        res.status(500).json({
            success: false,
            message: "Erro interno do servidor: " + error.message,
        });
    }
});

app.post("/api/exams/:examId/submit", async (req, res) => {
    const examId = req.params.id;
    const { studentCpf, answers } = req.body;
    console.log(`Recebendo respostas da prova ${examId} do aluno ${studentCpf}`);
    try {
        const row = await db.get(
            `SELECT COUNT(*) as count FROM respostas WHERE prova_id = ? AND aluno_cpf = ?`,
            [examId, studentCpf]
        );
        if (row.count > 0) {
            return res.status(400).json({ error: "Você já realizou esta prova" });
        }
        for (const answer of answers) {
            await db.run(
                `INSERT INTO respostas (id, prova_id, aluno_cpf, questao_id, resposta, correta) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    uuidv4(),
                    examId,
                    studentCpf,
                    answer.questionId,
                    answer.answer,
                    answer.isCorrect ? 1 : 0,
                ]
            );
        }
        const rows = await db.all(
            `SELECT correta FROM respostas WHERE prova_id = ? AND aluno_cpf = ?`,
            [examId, studentCpf]
        );
        const total = rows.length;
        const corretas = rows.filter((row) => row.correta === 1).length;
        const nota = total > 0 ? ((corretas / total) * 10).toFixed(2) : 0;
        await db.run(
            `INSERT INTO notas (id, prova_id, aluno_cpf, nota, data_submissao) VALUES (?, ?, ?, ?, datetime('now'))`,
            [uuidv4(), examId, studentCpf, nota]
        );
        res.json({
            success: true,
            message: "Prova submetida com sucesso!",
            nota: nota,
        });
    } catch (err) {
        console.error("Erro ao salvar respostas:", err);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

app.post("/api/usuarios/login", async (req, res) => {
    const { cpf, senha, tipo, turma } = req.body;
    try {
        // Consulta direta no banco
        const row = await db.get(
            `SELECT * FROM usuarios WHERE cpf = ? AND tipo = ?`,
            [cpf, tipo]
        );
        
        if (!row) {
            return res.json({ success: false, message: "Usuário não encontrado" });
        }
        if (row.senha !== senha) {
            return res.json({ success: false, message: "Senha incorreta" });
        }
        if (row.turma !== turma) {
            return res.json({ success: false, message: "Turma incorreta" });
        }
        res.json({
            success: true,
            usuario: {
                nome: row.nome,
                cpf: row.cpf,
                tipo: row.tipo,
                turma: row.turma,
            },
        });
    } catch (err) {
        return res.json({ success: false, message: "Erro no servidor" });
    }
});

app.post("/api/usuarios/cadastrar", async (req, res) => {
    const { nome, cpf, senha, tipo, turma } = req.body;
    try {
        // Verificar se CPF já existe no banco
        const row = await db.get(
            `SELECT id FROM usuarios WHERE cpf = ?`,
            [cpf]
        );
        if (row) {
            return res.json({ success: false, message: "CPF já cadastrado" });
        }
        
        const id = crypto.randomBytes(16).toString("hex");
        await db.run(
            `INSERT INTO usuarios (id, nome, cpf, senha, tipo, turma, data_cadastro) 
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
            [id, nome, cpf, senha, tipo, turma]
        );
        
        res.json({
            success: true,
            message: "Usuário criado com sucesso",
            usuario: { nome, cpf, tipo, turma },
        });
    } catch (err) {
        return res.json({ success: false, message: "Erro ao criar usuário" });
    }
});

app.get("/api/auth/status", (req, res) => {
    if (req.session && req.session.user) {
        res.json({
            authenticated: true,
            user: req.session.user,
        });
    } else {
        res.json({
            authenticated: false,
        });
    }
});

// Rota específica para servir aluno.html
// Rota para a área do aluno com URL única
app.get('/aluno/:alunoId', async (req, res) => {
    try {
        const { alunoId } = req.params;
        console.log('[ROTA ALUNO] Acessando área do aluno ID:', alunoId);
        
        // Verificar se o aluno existe no banco
        const aluno = await db.get(
            `SELECT * FROM usuarios WHERE id = ? AND tipo = 'aluno'`,
            [alunoId]
        );
        
        if (!aluno) {
            console.log('[ROTA ALUNO] Aluno não encontrado:', alunoId);
            return res.status(404).send('Aluno não encontrado');
        }
        
        console.log('[ROTA ALUNO] Aluno encontrado:', aluno.nome);

        // Se já está logado e é o mesmo aluno, servir a página
        if (req.session.user && req.session.user.id === alunoId) {
            console.log('[ROTA ALUNO] Usuário autenticado, servindo página');
            return res.sendFile(path.join(__dirname, '../frontend/aluno/aluno.html'));
        }

        // Se não está logado, redirecionar para login
        console.log('[ROTA ALUNO] Usuário não autenticado, redirecionando para login');
        res.redirect(`/login/?redirect=/aluno/${alunoId}&message=Faça login para acessar sua área exclusiva`);
        
    } catch (error) {
        console.error('Erro na rota do aluno:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// Rota para a área do aluno
app.get('/aluno', checkAuth, (req, res) => {
    if (req.user.tipo !== 'aluno') {
        return res.redirect('/login/?error=Acesso restrito a alunos');
    }
    res.sendFile(path.join(__dirname, '../frontend/aluno/aluno.html'));
});

// Rota para criar prova e associar alunos
app.post('/api/professor/criar-prova', requireProfessorAuth, async (req, res) => {
    const { titulo, disciplina, data_limite, tempo_limite, descricao, questões, alunos } = req.body;
    
    try {
        console.log('Criando nova prova:', titulo);
        
        // Validar dados obrigatórios
        if (!titulo || !disciplina || !data_limite) {
            return res.status(400).json({
                success: false,
                message: 'Título, disciplina e data limite são obrigatórios'
            });
        }

        const provaId = uuidv4();
        const professorCpf = req.session.user.cpf;

        // Inserir prova no banco
        await db.run(
            `INSERT INTO provas (id, titulo, disciplina, professor_cpf, data_limite, tempo_limite, descricao) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`, 
            [provaId, titulo, disciplina, professorCpf, data_limite, tempo_limite, descricao || '']
        );

        // Associar alunos à prova
        if (alunos && alunos.length > 0) {
            for (const alunoCpf of alunos) {
                await db.run(
                    `INSERT INTO provas_alunos (prova_id, aluno_cpf) VALUES (?, ?)`,
                    [provaId, alunoCpf]
                );
                console.log('Aluno associado:', alunoCpf);
            }
        }

        // Inserir questões
        if (questões && questões.length > 0) {
            for (const [index, questao] of questões.entries()) {
                const questaoId = uuidv4();
                
                await db.run(
                    `INSERT INTO questoes (id, prova_id, tipo, enunciado, valor, ordem) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [questaoId, provaId, questao.tipo, questao.enunciado, questao.valor || 1.0, index]
                );

                // Inserir alternativas para questões de múltipla escolha
                if (questao.tipo === 'multipla_escolha' && questao.alternativas) {
                    for (const [altIndex, alternativa] of questao.alternativas.entries()) {
                        await db.run(
                            `INSERT INTO alternativas (id, questao_id, texto, correta, ordem) 
                             VALUES (?, ?, ?, ?, ?)`,
                            [uuidv4(), questaoId, alternativa.texto, alternativa.correta ? 1 : 0, altIndex]
                        );
                    }
                }
            }
        }

        res.json({
            success: true,
            message: 'Prova criada com sucesso!',
            provaId: provaId
        });

    } catch (error) {
        console.error('Erro ao criar prova:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor: ' + error.message
        });
    }
});

// Rota para listar todos os alunos
app.get('/api/professor/alunos', requireProfessorAuth, async (req, res) => {
    try {
        const alunos = await db.all(
            `SELECT id, nome, cpf, turma FROM usuarios WHERE tipo = 'aluno'`
        );

        res.json({
            success: true,
            alunos: alunos
        });

    } catch (error) {
        console.error('Erro ao listar alunos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// Rota para listar provas de um aluno específico
app.get('/api/professor/aluno/:cpf/provas', requireProfessorAuth, async (req, res) => {
    try {
        const { cpf } = req.params;
        
        const provas = await db.all(`
            SELECT p.*, pa.aluno_cpf 
            FROM provas p
            JOIN provas_alunos pa ON p.id = pa.prova_id
            WHERE pa.aluno_cpf = ?
            ORDER BY p.data_criacao DESC
        `, [cpf]);

        res.json({
            success: true,
            provas: provas
        });

    } catch (error) {
        console.error('Erro ao listar provas do aluno:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// ===== ROTAS DE PÁGINAS HTML =====
app.get(
    [
        "/",
        "/login",
        "/login/",
        "/login.html",
        "/aluno/login",
        "/aluno/login.html",
        "/professor/login",
        "/professor/login.html",
    ],
    (req, res) => {
        console.log("[ROTA] Servindo página de login");
        res.sendFile(path.join(__dirname, "../frontend/login/login.html"));
    }
);

// Rotas do Aluno - Middleware checkAuth aplicado AQUI
app.get(
    [
        "/aluno",
        "/aluno/dashboard",
        "/aluno/aluno.html",
        "/aluno/acesso",
        "/aluno/acesso/",
    ],
    checkAuth,
    (req, res) => {
        if (req.user.tipo !== "aluno") {
            return res.redirect("/login/?error=Acesso restrito a alunos");
        }
        console.log("[ROTA] Servindo página do aluno para:", req.user.nome);
        res.sendFile(path.join(__dirname, "../frontend/aluno/aluno.html"));
    }
);

app.get(
    [
        "/aluno/acesso/provas",
        "/aluno/acesso/provas.html",
        "/provas",
        "/provas.html",
    ],
    checkAuth,
    (req, res) => {
        if (req.user.tipo !== "aluno") {
            return res.redirect("/login/?error=Acesso restrito a alunos");
        }
        console.log(
            "[ROTA] Servindo página de provas do aluno para:",
            req.user.nome
        );
        res.sendFile(path.join(__dirname, "../frontend/aluno/acesso/provas.html"));
    }
);

// Rotas do Professor - Middleware checkAuth aplicado AQUI - CORRIGIDO
app.get(
    [
        "/professor",
        "/professor.html",
        "/professor/dashboard",
        "/professor/professor.html",
    ],
    checkAuth,
    (req, res) => {
        // VERIFICAÇÃO DE SEGURANÇA ADICIONADA
        if (!req.user || !req.user.tipo) {
            console.error("[ERRO] Usuário não definido na requisição:", req.user);
            return res.status(401).json({ 
                success: false, 
                message: 'Dados de usuário inválidos' 
            });
        }

        // Verifica se é professor
        if (req.user.tipo !== "professor") {
            return res.redirect("/login/?error=Acesso restrito a professores");
        }
        
        console.log("[ROTA] Servindo página do professor para:", req.user.nome);
        res.sendFile(path.join(__dirname, "../frontend/professor/professor.html"));
    }
);

app.get(
    [
        "/professor/criar",
        "/professor/criarprova",
        "/professor/criarprova.html",
        "/criarprova.html",
    ],
    checkAuth,
    (req, res) => {
        if (req.user.tipo !== "professor") {
            return res.redirect("/login/?error=Acesso restrito a professores");
        }
        res.sendFile(
            path.join(__dirname, "../frontend/professor/criar/criarprova.html")
        );
    }
);

app.get(
    ["/professor/gerenciar", "/professor/gerenciar.html"],
    checkAuth,
    (req, res) => {
        if (req.user.tipo !== "professor") {
            return res.redirect("/login/?error=Acesso restrito a professores");
        }
        res.sendFile(
            path.join(__dirname, "../frontend/professor/gerenciar/gerenciar.html")
        );
    }
);

app.get(
    ["/professor/resultados", "/professor/resultados.html"],
    checkAuth,
    (req, res) => {
        if (req.user.tipo !== "professor") {
            return res.redirect("/login/?error=Acesso restrito a professores");
        }
        res.sendFile(
            path.join(__dirname, "../frontend/professor/resultados/resultados.html")
        );
    }
);

// Rotas Institucionais
app.get(["/cadastro", "/cadastro/"], (req, res) => {
    console.log("[ROTA] Servindo página de cadastro");
    res.sendFile(path.join(__dirname, "../frontend/cadastro/cadastro.html"));
});

app.get("/contato", (req, res) => {
    console.log("[ROTA] Servindo página de contato");
    res.sendFile(path.join(__dirname, "../frontend/contato/contato.html"));
});

app.get("/politica", (req, res) => {
    console.log("[ROTA] Servindo página de política");
    res.sendFile(path.join(__dirname, "../frontend/politica/politica.html"));
});

app.get("/termos", (req, res) => {
    console.log("[ROTA] Servindo página de termos");
    res.sendFile(path.join(__dirname, "../frontend/termos/termos.html"));
});

app.get("/acesso-unico/:linkUnico", async (req, res) => {
    try {
        const { linkUnico } = req.params;

        // Extrair o ID do aluno do link único (primeira parte antes do hífen)
        const aluno_id = linkUnico.split("-")[0];

        // Verificar se o link existe e é válido
        const row = await db.get(
            `SELECT lu.*, p.titulo, p.data_limite 
             FROM links_unicos lu 
             JOIN provas p ON lu.prova_id = p.id 
             WHERE lu.link_unico = ? AND lu.utilizado = 0`,
            [linkUnico]
        );

        if (!row) {
            return res.status(404).send("Link inválido ou já utilizado");
        }

        // Verificar se o ID do aluno corresponde
        const usuario = await db.get(
            `SELECT * FROM usuarios WHERE id = ?`,
            [aluno_id]
        );

        if (!usuario) {
            return res.status(404).send("Aluno não encontrado");
        }

        const dataLimite = new Date(row.data_limite);
        const agora = new Date();

        if (agora > dataLimite) {
            return res.status(400).send("Prazo para realização da prova expirado");
        }

        // Marcar link como utilizado
        await db.run(
            `UPDATE links_unicos SET utilizado = 1, data_utilizacao = datetime('now') WHERE link_unico = ?`,
            [linkUnico]
        );

        // Armazenar informações do aluno na sessão
        req.session.alunoProva = {
            aluno_id: aluno_id,
            aluno_cpf: usuario.cpf,
            prova_id: row.prova_id,
            link_unico: linkUnico,
        };

        res.sendFile(
            path.join(__dirname, "../frontend/aluno/acesso/prova-unica.html")
        );
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Nova rota para obter ou gerar link único do aluno para uma prova
app.get("/api/aluno/link-unico/:provaId", checkAuth, async (req, res) => {
    try {
        const { provaId } = req.params;
        const alunoCpf = req.session.user.cpf;

        // Verificar se o aluno tem acesso a esta prova
        const provaAluno = await db.get(
            `SELECT * FROM provas_alunos WHERE prova_id = ? AND aluno_cpf = ?`,
            [provaId, alunoCpf]
        );

        if (!provaAluno) {
            return res
                .status(403)
                .json({ error: "Você não tem acesso a esta prova" });
        }

        // Verificar se já existe um link único
        const linkExistente = await db.get(
            `SELECT * FROM links_unicos WHERE prova_id = ? AND aluno_cpf = ?`,
            [provaId, alunoCpf]
        );

        if (linkExistente) {
            return res.json({
                link_unico: linkExistente.link_unico,
                url_acesso: `http://localhost:3000/acesso-unico/${linkExistente.link_unico}`,
                prova_id: provaId,
                status: "existente",
            });
        }

        // Se não existe, criar um novo link único
        const usuario = await db.get(
            `SELECT id FROM usuarios WHERE cpf = ?`,
            [alunoCpf]
        );

        if (!usuario) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }

        const aluno_id = usuario.id;
        const linkUnico = `${aluno_id}-${uuidv4()}`;

        await db.run(
            `INSERT INTO links_unicos (prova_id, aluno_cpf, link_unico, data_criacao) VALUES (?, ?, ?, datetime('now'))`,
            [provaId, alunoCpf, linkUnico]
        );

        res.json({
            link_unico: linkUnico,
            url_acesso: `http://localhost:3000/acesso-unico/${linkUnico}`,
            prova_id: provaId,
            status: "novo",
        });
    } catch (err) {
        console.error("Erro ao gerar link único:", err);
        res.status(500).json({ error: err.message });
    }
});

// Rota para listar provas disponíveis para o aluno
app.get("/api/aluno/provas", checkAuth, async (req, res) => {
    try {
        const alunoCpf = req.session.user.cpf;

        const provas = await db.all(
            `
            SELECT p.*, lu.link_unico, lu.utilizado
            FROM provas p
            LEFT JOIN provas_alunos pa ON p.id = pa.prova_id
            LEFT JOIN links_unicos lu ON p.id = lu.prova_id AND lu.aluno_cpf = ?
            WHERE pa.aluno_cpf = ?
            ORDER BY p.data_criacao DESC
        `,
            [alunoCpf, alunoCpf]
        );

        res.json(provas);
    } catch (err) {
        console.error("Erro ao buscar provas do aluno:", err);
        res.status(500).json({ error: err.message });
    }
});

// Rota para obter ou gerar link único para o aluno
app.get("/api/aluno/provas-com-links", checkAuth, async (req, res) => {
    try {
        const alunoCpf = req.session.user.cpf;

        console.log("Buscando provas para aluno CPF:", alunoCpf);

        // Buscar provas do aluno
        const provas = await db.all(
            `
            SELECT p.* 
            FROM provas p
            JOIN provas_alunos pa ON p.id = pa.prova_id
            WHERE pa.aluno_cpf = ?
            ORDER BY p.data_criacao DESC
        `,
            [alunoCpf]
        );

        console.log("Provas encontradas:", provas.length);

        // Para cada prova, verificar/gerar link único
        const provasComLinks = [];

        for (const prova of provas) {
            // Verificar se já existe link único
            const linkExistente = await db.get(
                `SELECT * FROM links_unicos WHERE prova_id = ? AND aluno_cpf = ?`,
                [prova.id, alunoCpf]
            );

            let link_unico = null;

            if (linkExistente) {
                link_unico = linkExistente.link_unico;
                console.log("Link existente para prova", prova.id, ":", link_unico);
            } else {
                // Gerar novo link único
                const usuario = await db.get(
                    `SELECT id FROM usuarios WHERE cpf = ?`,
                    [alunoCpf]
                );

                if (usuario) {
                    link_unico = `${usuario.id}-${uuidv4()}`;

                    await db.run(
                        `INSERT INTO links_unicos (prova_id, aluno_cpf, link_unico, data_criacao) 
                         VALUES (?, ?, ?, datetime('now'))`,
                        [prova.id, alunoCpf, link_unico]
                    );

                    console.log("Novo link gerado para prova", prova.id, ":", link_unico);
                }
            }

            provasComLinks.push({
                ...prova,
                link_unico: link_unico,
                url_acesso: link_unico
                    ? `http://localhost:3000/acesso-unico/${link_unico}`
                    : null,
            });
        }

        res.json(provasComLinks);
    } catch (err) {
        console.error("Erro ao buscar provas com links:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get("/prova/:id", (req, res) => {
    const provaId = req.params.id;
    const token = req.query.token;
    if (!token) {
        return res.status(401).send("Acesso não autorizado. Token necessário.");
    }
    console.log("Acesso à prova:", provaId, "com token:", token);
    res.sendFile(path.join(__dirname, "../frontend/aluno/acesso/prova.html"));
});

// Rota para a área do aluno com URL única
app.get("/aluno/:alunoId", async (req, res) => {
    try {
        const { alunoId } = req.params;

        // Verificar se o aluno existe
        const aluno = await db.get(
            `SELECT * FROM usuarios WHERE id = ? AND tipo = 'aluno'`,
            [alunoId]
        );

        if (!aluno) {
            return res.status(404).send("Aluno não encontrado");
        }

        // Se já está logado e é o mesmo aluno, redirecionar para a área
        if (req.session.user && req.session.user.id === alunoId) {
            return res.sendFile(path.join(__dirname, "../frontend/aluno.html"));
        }

        // Se não está logado, mostrar página de login com redirecionamento
        res.sendFile(path.join(__dirname, "../frontend/login/login.html"));
    } catch (error) {
        console.error("Erro na rota do aluno:", error);
        res.status(500).send("Erro interno do servidor");
    }
});

// Rota para gerar URL única do aluno
app.get("/api/aluno/url-unica", checkAuth, async (req, res) => {
    try {
        console.log("[URL UNICA] Verificando autenticação...");

        if (!req.session.user || req.session.user.tipo !== "aluno") {
            console.log("[URL UNICA] Acesso não autorizado:", req.session.user);
            return res.status(403).json({ error: "Acesso restrito a alunos" });
        }

        const urlUnica = `http://localhost:3000/aluno/${req.session.user.id}`;

        console.log("[URL UNICA] Gerada para aluno:", req.session.user.id);

        res.json({
            url_unica: urlUnica,
            aluno_id: req.session.user.id,
            aluno_nome: req.session.user.nome,
            message: "URL única gerada com sucesso",
        });
    } catch (error) {
        console.error("Erro ao gerar URL única:", error);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
});

// Middleware para verificar se o aluno acessando pela URL única é o mesmo logado - CORRIGIDO
app.use("/aluno/:alunoId*", (req, res, next) => {
    console.log(
        "[URL UNICA MIDDLEWARE] Verificando acesso para aluno:",
        req.params.alunoId
    );
    console.log("[URL UNICA MIDDLEWARE] Usuário na sessão:", req.session.user);

    if (req.session.user && req.session.user.id === req.params.alunoId) {
        console.log("[URL UNICA MIDDLEWARE] Acesso autorizado");
        next();
    } else {
        console.log(
            "[URL UNICA MIDDLEWARE] Acesso não autorizado, redirecionando para login"
        );
        res.redirect(
            `/login/?redirect=/aluno/${req.params.alunoId}&error=Acesso não autorizado`
        );
    }
});

// Rota para servir a página do aluno para URLs únicas - CORRIGIDA
app.get("/aluno/:alunoId", async (req, res) => {
    try {
        const { alunoId } = req.params;
        console.log("[ROTA ALUNO] Acessando área do aluno ID:", alunoId);

        // Verificar se o aluno existe no banco
        const aluno = await db.get(
            `SELECT * FROM usuarios WHERE id = ? AND tipo = 'aluno'`,
            [alunoId]
        );

        if (!aluno) {
            console.log("[ROTA ALUNO] Aluno não encontrado:", alunoId);
            return res.status(404).send("Aluno não encontrado");
        }

        console.log("[ROTA ALUNO] Aluno encontrado:", aluno.nome);

        // Se já está logado e é o mesmo aluno, servir a página
        if (req.session.user && req.session.user.id === alunoId) {
            console.log("[ROTA ALUNO] Usuário autenticado, servindo página");
            return res.sendFile(path.join(__dirname, "../frontend/aluno/aluno.html"));
        }

        // Se não está logado, redirecionar para login com mensagem
        console.log(
            "[ROTA ALUNO] Usuário não autenticado, redirecionando para login"
        );
        res.redirect(
            `/login/?redirect=/aluno/${alunoId}&message=Faça login para acessar sua área exclusiva`
        );
    } catch (error) {
        console.error("Erro na rota do aluno:", error);
        res.status(500).send("Erro interno do servidor");
    }
});

// ===== ROTA PARA PÁGINA DE URL ÚNICA (USADA POR ALUNOS E PROFESSORES) =====
app.get('/url', checkAuth, (req, res) => {
    // Verifica se é aluno OU professor
    if (!req.user || (req.user.tipo !== 'aluno' && req.user.tipo !== 'professor')) {
        console.log('[URL] Acesso negado para tipo de usuário:', req.user ? req.user.tipo : 'não definido');
        return res.redirect('/login/?error=Acesso restrito a alunos ou professores');
    }
    console.log(`[URL] Servindo página de URL única para ${req.user.tipo}:`, req.user.nome);
    const filePath = path.join(__dirname, '../frontend/UrlUnico/url.html');
    
    if (!fs.existsSync(filePath)) {
        console.error('[URL] ERRO: Arquivo não encontrado em:', filePath);
        return res.status(500).send('Erro interno: Página de URL única não configurada.');
    }
    
    res.sendFile(filePath);
});

// ===== ROTA PARA ACESSO VIA URL ÚNICA DO PROFESSOR =====
app.get('/professor/:professorId', async (req, res) => {
    try {
        const { professorId } = req.params;
        console.log('[ROTA PROFESSOR] Acessando área do professor ID:', professorId);
        
        // Verificar se o professor existe no banco de dados
        const professor = await db.get(
            `SELECT * FROM usuarios WHERE id = ? AND tipo = 'professor'`,
            [professorId]
        );
        
        if (!professor) {
            console.log('[ROTA PROFESSOR] Professor não encontrado:', professorId);
            return res.status(404).send('Professor não encontrado');
        }
        
        console.log('[ROTA PROFESSOR] Professor encontrado:', professor.nome);
        
        // Se já está logado e é o mesmo professor, servir a página do professor
        if (req.session.user && req.session.user.id === professorId) {
            console.log('[ROTA PROFESSOR] Usuário autenticado, servindo página do professor');
            return res.sendFile(path.join(__dirname, '../frontend/professor/professor.html'));
        }
        
        // Se não está logado, redirecionar para login com redirecionamento de volta
        console.log('[ROTA PROFESSOR] Usuário não autenticado, redirecionando para login');
        res.redirect(`/login/?redirect=/professor/${professorId}&message=Faça login para acessar sua área exclusiva`);
    } catch (error) {
        console.error('Erro na rota do professor:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

app.get("*.html", (req, res) => {
    const requestedPath = req.path;
    const filePath = path.join(__dirname, "../frontend", requestedPath);
    console.log("[ROTA] Buscando arquivo HTML:", filePath);
    if (fs.existsSync(filePath)) {
        console.log("[ROTA] Arquivo encontrado, enviando:", filePath);
        res.sendFile(filePath);
    } else {
        console.log("[ROTA] Arquivo não encontrado:", filePath);
        res.status(404).json({
            error: "Página não encontrada",
            path: requestedPath,
            method: req.method,
        });
    }
});

// ===== ROTAS DE SAÚDE DO SISTEMA =====
app.get("/api/status", (req, res) => {
    res.json({
        status: "online",
        message: "Servidor PROVA-ONLINE está funcionando!",
        timestamp: new Date().toISOString(),
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

// ===== MANIPULADORES DE ERRO =====
app.use((req, res) => {
    console.log("[ERRO] Rota não encontrada:", req.path);
    res.status(404).json({
        error: "Rota não encontrada",
        path: req.path,
        method: req.method,
    });
});

app.use((err, req, res, next) => {
    console.error("[ERRO] Erro interno:", err.stack);
    res.status(500).json({
        error: "Erro interno do servidor",
        message: err.message,
    });
});

// ===== INICIALIZAÇÃO DO SERVIDOR =====
initializeDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log("🎓 PROVA-ONLINE rodando!");
            console.log(`📍 http://localhost:${PORT}`);
            console.log(
                "📁 Servindo arquivos estáticos de:",
                path.join(__dirname, "../frontend")
            );
            console.log("✅ Rota /api/cadastro disponível");
            console.log("✅ Rota /api/auth/login disponível");
            console.log("✅ Rota /api/debug/session disponível para diagnóstico");
            console.log(
                "⚡ Modo otimizado ativado - Processamento em lote e fila assíncrona"
            );
            console.log("🔑 Usuários agora são armazenados no banco de dados SQLite");
            console.log(
                "💾 Sessões agora são gerenciadas em memória com limpeza automática"
            );
            console.log("🔐 JWT habilitado para autenticação via token");
            console.log("📝 Exemplo de usuário para teste:");
            console.log(
                "   Professor: CPF=12345678901, Senha=senha123, Tipo=professor"
            );
            console.log(
                "   Aluno: CPF=10987654321, Senha=senha123, Tipo=aluno, Turma=3A"
            );
        });
    })
    .catch((err) => {
        console.error("Falha ao inicializar o banco de dados:", err);
    });