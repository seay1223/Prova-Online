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

// Middlewares - IMPORTANTE: session deve vir ANTES de outros middlewares
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ===== CONFIGURAÇÃO DE SESSÕES - CORRIGIDA =====
app.use(
    session({
        name: 'provaonline.sid',
        secret: process.env.JWT_SECRET || "prova-online-secret-key-2025",
        resave: true, // Alterado para true
        saveUninitialized: false,
        cookie: {
            secure: false,
            maxAge: 24 * 60 * 60 * 1000, // 24 horas
            httpOnly: true,
            sameSite: "none",
            path: "/",
        },
        rolling: true,
    })
);

// Middleware para log de sessão
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log(`📋 Sessão ID: ${req.sessionID}`);
    console.log(`👤 Usuário na sessão:`, req.session.user || 'Nenhum');
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
        
    } catch (error) {
        console.error("❌ Erro ao conectar com o banco de dados:", error);
        process.exit(1);
    }
}

async function createTables() {
    // Tabela de usuários
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
    
    // Tabela de provas
    await db.exec(`
        CREATE TABLE IF NOT EXISTS provas (
            id TEXT PRIMARY KEY,
            titulo TEXT NOT NULL,
            disciplina TEXT NOT NULL,
            professor_id TEXT NOT NULL,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            data_limite DATE,
            tempo_limite INTEGER,
            descricao TEXT,
            FOREIGN KEY (professor_id) REFERENCES usuarios(id)
        )
    `);
    
    // Tabela de questões
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
    
    // Tabela de alternativas
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
    
    // Tabela de respostas
    await db.exec(`
        CREATE TABLE IF NOT EXISTS respostas (
            id TEXT PRIMARY KEY,
            prova_id TEXT NOT NULL,
            aluno_id TEXT NOT NULL,
            questao_id TEXT NOT NULL,
            resposta TEXT,
            correta INTEGER DEFAULT 0,
            data_resposta DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (prova_id) REFERENCES provas(id) ON DELETE CASCADE,
            FOREIGN KEY (questao_id) REFERENCES questoes(id) ON DELETE CASCADE,
            FOREIGN KEY (aluno_id) REFERENCES usuarios(id)
        )
    `);
    
    // Tabela de notas
    await db.exec(`
        CREATE TABLE IF NOT EXISTS notas (
            id TEXT PRIMARY KEY,
            prova_id TEXT NOT NULL,
            aluno_id TEXT NOT NULL,
            nota REAL NOT NULL,
            data_submissao DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (prova_id) REFERENCES provas(id) ON DELETE CASCADE,
            FOREIGN KEY (aluno_id) REFERENCES usuarios(id)
        )
    `);
    
    // Tabela de links únicos
    await db.exec(`
        CREATE TABLE IF NOT EXISTS links_unicos (
            id TEXT PRIMARY KEY,
            prova_id TEXT NOT NULL,
            aluno_id TEXT NOT NULL,
            link_unico TEXT NOT NULL UNIQUE,
            data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
            data_utilizacao DATETIME,
            utilizado INTEGER DEFAULT 0,
            FOREIGN KEY (prova_id) REFERENCES provas(id) ON DELETE CASCADE,
            FOREIGN KEY (aluno_id) REFERENCES usuarios(id)
        )
    `);
    
    // Tabela de provas_alunos (relação muitos para muitos)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS provas_alunos (
            prova_id TEXT NOT NULL,
            aluno_id TEXT NOT NULL,
            PRIMARY KEY (prova_id, aluno_id),
            FOREIGN KEY (prova_id) REFERENCES provas(id) ON DELETE CASCADE,
            FOREIGN KEY (aluno_id) REFERENCES usuarios(id)
        )
    `);
    
    console.log("✅ Todas as tabelas verificadas/criadas com sucesso!");
}

// ===== MIDDLEWARE DE AUTENTICAÇÃO - CORRIGIDO =====
function checkAuth(req, res, next) {
    console.log('🔐 CHECK AUTH - Sessão:', req.sessionID);
    console.log('🔐 CHECK AUTH - Usuário na sessão:', req.session.user);
    
    // Rotas públicas
    const publicRoutes = [
        "/", "/login", "/login/", "/cadastro", "/cadastro/",
        "/contato", "/politica", "/termos",
        "/api/auth/login", "/api/cadastro", "/api/test", "/health",
        "/api/status", "/api/debug/", "/favicon.ico",
        "/css/", "/js/", "/images/", "/api/auth/check",
        "/aluno/", "/professor/"
    ];
    
    const isPublicRoute = publicRoutes.some(route => 
        req.path === route || req.path.startsWith(route)
    );
    
    if (isPublicRoute) {
        console.log('✅ Rota pública, acesso permitido');
        return next();
    }

    // Verificar sessão
    if (req.session && req.session.user) {
        console.log(`✅ Usuário autenticado: ${req.session.user.nome} (${req.session.user.tipo})`);
        req.user = req.session.user;
        return next();
    }

    // Verificar JWT token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            console.log(`✅ Usuário autenticado via token: ${decoded.nome} (${decoded.tipo})`);
            return next();
        } catch (error) {
            console.log("❌ Token inválido:", error.message);
        }
    }

    // Não autenticado
    console.log(`❌ Acesso não autenticado à rota: ${req.path}`);
    if (req.path.startsWith("/api/")) {
        return res.status(401).json({ 
            success: false, 
            error: "Não autenticado", 
            redirect: "/login/" 
        });
    }
    res.redirect("/login/?error=Sessão expirada. Faça login novamente.");
}

function requireProfessor(req, res, next) {
    if (!req.user || req.user.tipo !== "professor") {
        if (req.xhr || req.headers.accept?.includes("json")) {
            return res.status(403).json({
                success: false,
                error: "Acesso não autorizado",
                message: "Acesso restrito a professores"
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
    for (let i = 1; i <= 9; i++) 
        soma += parseInt(cpf[i-1]) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf[9])) return false;
    
    soma = 0;
    for (let i = 1; i <= 10; i++) 
        soma += parseInt(cpf[i-1]) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf[10])) return false;
    
    return true;
}

// ===== ROTAS PRINCIPAIS DA API =====

// ROTA DE LOGIN - CORRIGIDA
app.post("/api/auth/login", async (req, res) => {
    const { cpf, senha, tipo, turma } = req.body;
    
    try {
        if (!cpf || !senha || !tipo) {
            return res.status(400).json({ 
                success: false, 
                message: "CPF, senha e tipo de usuário são obrigatórios." 
            });
        }

        const cleanCpf = cpf.replace(/\D/g, "");
        console.log(`[LOGIN] Tentativa: CPF=${cleanCpf}, Tipo=${tipo}, Turma=${turma}`);
        
        // Buscar usuário
        const usuario = await db.get(
            "SELECT * FROM usuarios WHERE cpf = ? AND tipo = ?", 
            [cleanCpf, tipo]
        );
        
        if (!usuario) {
            console.log(`[LOGIN] Usuário não encontrado: CPF=${cleanCpf}, Tipo=${tipo}`);
            return res.status(401).json({ 
                success: false, 
                message: "Usuário não encontrado. Verifique o CPF e tipo de conta." 
            });
        }

        console.log(`[LOGIN] Usuário encontrado: ${usuario.nome} (${usuario.tipo})`);

        // Verificar senha
        if (usuario.senha !== senha) {
            console.log(`[LOGIN] Senha incorreta para: ${usuario.nome}`);
            return res.status(401).json({ 
                success: false, 
                message: "Senha incorreta. Tente novamente." 
            });
        }

        // Verificar turma para alunos
        if (tipo === "aluno" && usuario.turma !== turma) {
            console.log(`[LOGIN] Turma incorreta. Esperada: ${usuario.turma}, Recebida: ${turma}`);
            return res.status(401).json({ 
                success: false, 
                message: `Turma incorreta. Sua turma é ${usuario.turma}.` 
            });
        }

        // VERIFICAR SE O TIPO É VÁLIDO
        if (usuario.tipo !== 'aluno' && usuario.tipo !== 'professor') {
            console.log(`[LOGIN] Tipo de usuário inválido: ${usuario.tipo}`);
            return res.status(401).json({ 
                success: false, 
                message: "Tipo de usuário não suportado." 
            });
        }

        // Criar payload do usuário
        const userPayload = {
            id: usuario.id,
            nome: usuario.nome,
            cpf: usuario.cpf,
            tipo: usuario.tipo,
            turma: usuario.turma,
        };

        // Gerar token JWT
        const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '24h' });
        
        // Configurar sessão - CORRIGIDO
        req.session.regenerate((err) => {
            if (err) {
                console.error("[LOGIN] Erro ao regenerar sessão:", err);
                return res.status(500).json({ 
                    success: false, 
                    message: "Erro interno do servidor" 
                });
            }
            
            // Salvar usuário na sessão
            req.session.user = userPayload;
            
            // Forçar salvamento da sessão
            req.session.save((err) => {
                if (err) {
                    console.error("[LOGIN] Erro ao salvar sessão:", err);
                    return res.status(500).json({ 
                        success: false, 
                        message: "Erro interno do servidor" 
                    });
                }
                
                console.log(`[LOGIN] ✅ Login bem-sucedido: ${usuario.nome} (${usuario.tipo})`);
                console.log(`[LOGIN] 📋 Nova sessão ID: ${req.sessionID}`);
                console.log(`[LOGIN] 👤 Usuário salvo na sessão:`, req.session.user);
                
                // SEMPRE redirecionar para /url após login
                res.json({
                    success: true,
                    message: "Login realizado com sucesso!",
                    user: userPayload,
                    token: token,
                    redirectUrl: "/url", // SEMPRE vai para a página de URL única
                });
            });
        });
        
    } catch (error) {
        console.error("❌ ERRO CRÍTICO NO LOGIN:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erro interno do servidor. Tente novamente." 
        });
    }
});

// ROTA DE VERIFICAÇÃO DE AUTENTICAÇÃO - CORRIGIDA
app.get("/api/auth/check", (req, res) => {
    console.log('🔍 CHECK SESSION - Sessão ID:', req.sessionID);
    console.log('🔍 CHECK SESSION - Usuário:', req.session.user);
    
    if (req.session && req.session.user) {
        res.json({ 
            success: true,
            isAuthenticated: true, 
            user: req.session.user,
            sessionId: req.sessionID
        });
    } else {
        res.status(401).json({ 
            success: true,
            isAuthenticated: false, 
            message: "Não autenticado",
            sessionId: req.sessionID
        });
    }
});

// ROTA DE CADASTRO
app.post("/api/cadastro", async (req, res) => {
    const { nome, cpf, senha, tipo, turma } = req.body;
    
    try {
        if (!nome || !cpf || !senha || !tipo) {
            return res.status(400).json({ 
                success: false, 
                message: "Todos os campos são obrigatórios." 
            });
        }
        
        if (tipo === "aluno" && !turma) {
            return res.status(400).json({ 
                success: false, 
                message: "Turma é obrigatória para alunos." 
            });
        }
        
        if (!isValidCPF(cpf)) {
            return res.status(400).json({ 
                success: false, 
                message: "CPF inválido." 
            });
        }
        
        const cleanCpf = cpf.replace(/\D/g, "");
        const existingUser = await db.get(
            "SELECT id FROM usuarios WHERE cpf = ?", 
            [cleanCpf]
        );
        
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: "Já existe um usuário cadastrado com este CPF." 
            });
        }
        
        const userId = uuidv4();
        await db.run(`
            INSERT INTO usuarios (id, nome, cpf, senha, tipo, turma, data_cadastro)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            userId,
            nome,
            cleanCpf,
            senha,
            tipo,
            tipo === "aluno" ? turma : null,
            new Date().toISOString()
        ]);
        
        console.log(`✅ Novo usuário cadastrado: ${nome} (${cleanCpf})`);
        
        res.json({ 
            success: true, 
            message: "Usuário cadastrado com sucesso!" 
        });
        
    } catch (error) {
        console.error("❌ Erro ao cadastrar usuário:", error);
        res.status(500).json({ 
            success: false, 
            message: "Erro interno do servidor." 
        });
    }
});

// ROTA DE LOGOUT
app.post("/api/auth/logout", (req, res) => {
    console.log('🚪 LOGOUT - Sessão ID:', req.sessionID);
    
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Erro ao destruir sessão:', err);
            return res.status(500).json({ 
                success: false,
                error: "Erro ao fazer logout" 
            });
        }
        
        console.log('✅ Sessão destruída com sucesso');
        res.json({ 
            success: true, 
            message: "Logout realizado com sucesso" 
        });
    });
});

// ===== ROTAS DE PÁGINAS =====

// Páginas públicas
app.get(["/", "/login", "/login/"], (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/login/login.html"));
});

app.get(["/cadastro", "/cadastro/"], (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/cadastro/cadastro.html"));
});

// Página de URL única (OBRIGATÓRIA após login) - CORRIGIDA
app.get('/url', checkAuth, (req, res) => {
    console.log('🔗 Acessando página de URL única - Usuário:', req.user);
    
    if (!req.user) {
        console.log('❌ Usuário não autenticado na rota /url');
        return res.redirect('/login/?error=Usuário não autenticado');
    }
    
    // Verificar se o usuário tem tipo válido
    if (req.user.tipo !== 'aluno' && req.user.tipo !== 'professor') {
        console.log('❌ Tipo de usuário inválido:', req.user.tipo);
        return res.redirect('/login/?error=Tipo de usuário não suportado');
    }
    
    console.log(`✅ Acesso permitido à página de URL única para ${req.user.tipo}: ${req.user.nome}`);
    
    const filePath = path.join(__dirname, '../frontend/UrlUnico/url.html');
    if (!fs.existsSync(filePath)) {
        console.log('❌ Arquivo url.html não encontrado');
        return res.status(500).send('Erro: Página de URL única não encontrada.');
    }
    res.sendFile(filePath);
});

// Área do aluno via URL única
app.get('/aluno/:alunoId', async (req, res) => {
    try {
        const { alunoId } = req.params;
        console.log(`👤 Tentativa de acesso à área do aluno: ${alunoId}`);
        
        // Verificar se o usuário existe
        const aluno = await db.get(
            "SELECT id, nome, cpf, tipo, turma FROM usuarios WHERE id = ? AND tipo = 'aluno'", 
            [alunoId]
        );
        
        if (!aluno) {
            console.log(`❌ Aluno não encontrado: ${alunoId}`);
            return res.status(404).send('Aluno não encontrado');
        }
        
        console.log(`✅ Aluno encontrado: ${aluno.nome}`);
        
        // Se já está autenticado e é o mesmo usuário
        if (req.session.user && req.session.user.id === alunoId) {
            console.log(`✅ Usuário autenticado acessando sua área: ${aluno.nome}`);
            return res.sendFile(path.join(__dirname, '../frontend/aluno/aluno.html'));
        }
        
        // Se não está autenticado, redirecionar para login
        console.log(`🔐 Redirecionando para login com redirect: /aluno/${alunoId}`);
        res.redirect(`/login/?redirect=/aluno/${alunoId}&message=Faça login para acessar sua área exclusiva`);
        
    } catch (error) {
        console.error('❌ Erro na rota do aluno:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// Área do professor via URL única
app.get('/professor/:professorId', async (req, res) => {
    try {
        const { professorId } = req.params;
        console.log(`👨‍🏫 Tentativa de acesso à área do professor: ${professorId}`);
        
        // Verificar se o usuário existe
        const professor = await db.get(
            "SELECT id, nome, cpf, tipo, turma FROM usuarios WHERE id = ? AND tipo = 'professor'", 
            [professorId]
        );
        
        if (!professor) {
            console.log(`❌ Professor não encontrado: ${professorId}`);
            return res.status(404).send('Professor não encontrado');
        }
        
        console.log(`✅ Professor encontrado: ${professor.nome}`);
        
        // Se já está autenticado e é o mesmo usuário
        if (req.session.user && req.session.user.id === professorId) {
            console.log(`✅ Usuário autenticado acessando sua área: ${professor.nome}`);
            return res.sendFile(path.join(__dirname, '../frontend/professor/professor.html'));
        }
        
        // Se não está autenticado, redirecionar para login
        console.log(`🔐 Redirecionando para login com redirect: /professor/${professorId}`);
        res.redirect(`/login/?redirect=/professor/${professorId}&message=Faça login para acessar sua área exclusiva`);
        
    } catch (error) {
        console.error('❌ Erro na rota do professor:', error);
        res.status(500).send('Erro interno do servidor');
    }
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, "../frontend")));

// Rota de saúde
app.get("/api/status", (req, res) => {
    res.json({ 
        success: true,
        status: "online", 
        message: "Servidor PROVA-ONLINE está funcionando!", 
        timestamp: new Date().toISOString(),
        version: "2.0.0"
    });
});

app.get("/health", (req, res) => {
    res.json({ 
        success: true,
        status: "OK", 
        timestamp: new Date().toISOString(), 
        uptime: process.uptime(),
        database: db ? "connected" : "disconnected"
    });
});

// Criar arquivo 404.html se não existir
const notFoundPath = path.join(__dirname, "../frontend/404.html");
if (!fs.existsSync(notFoundPath)) {
    const notFoundHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Página Não Encontrada</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: #666; }
            </style>
        </head>
        <body>
            <h1>404 - Página Não Encontrada</h1>
            <p>A página que você está procurando não existe.</p>
            <a href="/">Voltar para a página inicial</a>
        </body>
        </html>
    `;
    fs.writeFileSync(notFoundPath, notFoundHtml);
    console.log('✅ Arquivo 404.html criado');
}

// Manipulador de rotas não encontradas
app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ 
            success: false,
            error: "Rota não encontrada", 
            path: req.path 
        });
    } else {
        res.status(404).sendFile(notFoundPath);
    }
});

// Manipulador de erros
app.use((err, req, res, next) => {
    console.error("❌ Erro interno:", err.stack);
    res.status(500).json({ 
        success: false,
        error: "Erro interno do servidor", 
        message: err.message 
    });
});

// Inicialização do servidor
initializeDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log("\n🎓 PROVA-ONLINE RODANDO!");
            console.log("📍 http://localhost:" + PORT);
            console.log("\n⚡ Servidor pronto para receber conexões!");
            console.log("📝 Use a página de cadastro para criar usuários.");
            console.log("🔗 Todos os logins redirecionam para a página de URL única.\n");
        });
    })
    .catch((err) => {
        console.error("❌ Falha ao inicializar o servidor:", err);
        process.exit(1);
    });