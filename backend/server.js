import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import session from 'express-session';

// Configuração do __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = 3000;

// Inicializar o banco de dados
let db;
async function initializeDatabase() {
    try {
        // Garantir que o diretório do banco de dados existe
        const dbDir = path.join(__dirname, 'database');
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        db = await open({
            filename: path.join(dbDir, 'database.db'),
            driver: sqlite3.Database
        });
        console.log('✅ Banco de dados conectado com sucesso!');
        
        // Criar tabelas se não existirem
        await createTables();
    } catch (error) {
        console.error('❌ Erro ao conectar com o banco de dados:', error);
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
    
    console.log('✅ Tabelas verificadas/criadas com sucesso!');
}

// ===== MIDDLEWARES =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== CONFIGURAÇÃO DE SESSÕES =====
// Configuração de sessão simplificada
app.use(session({
    secret: 'prova-online-secret-key-2025-' + Math.random().toString(36).substring(2),
    resave: true,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Sistema de limpeza de sessões em memória
const activeSessions = new Map();
app.use((req, res, next) => {
    if (req.session && req.session.user) {
        activeSessions.set(req.sessionID, {
            userId: req.session.user.id,
            lastAccess: Date.now()
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
    console.log('Sessões ativas:', activeSessions.size);
}, 60 * 60 * 1000);

// Middleware para garantir que a sessão seja salva
app.use((req, res, next) => {
    if (!req.session) {
        return next(new Error('Session not available'));
    }
    next();
});

// Middleware para debug de sessões
app.use((req, res, next) => {
    console.log('=== SESSION DEBUG ===');
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', JSON.stringify(req.session, null, 2));
    console.log('User in session:', req.session?.user);
    console.log('========================');
    next();
});

// Middleware de logging detalhado
app.use((req, res, next) => {
    console.log(`[DEBUG] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ===== SERVIÇO DE ARQUIVOS ESTÁTICOS =====
const staticPaths = [
    '/css',
    '/js',
    '/images',
    '/aluno',
    '/professor',
    '/login',
    '/contato',
    '/politica',
    '/termos',
    '/cadastro',
    '/professor/criar',
    '/professor/gerenciar',
    '/professor/resultados',
    '/aluno/acesso'
];

staticPaths.forEach(pathName => {
    app.use(pathName, express.static(path.join(__dirname, `../frontend${pathName}`)));
});

app.use(express.static(path.join(__dirname, '../frontend')));

// ===== MIDDLEWARE DE AUTENTICAÇÃO =====
function checkAuth(req, res, next) {
    console.log('[AUTH] Verificando autenticação para:', req.path);
    
    // Lista de rotas públicas ampliada
    const publicRoutes = [
        '/',
        '/login',
        '/login/',
        '/cadastro',
        '/cadastro/',
        '/contato',
        '/politica',
        '/termos',
        '/api/auth/login',
        '/api/cadastro',
        '/api/test',
        '/health',
        '/api/status',
        '/api/debug/session',
        '/favicon.ico',
        '/css/',
        '/js/',
        '/images/'
    ];
    
    // Verificar se é uma rota pública
    const isPublicRoute = publicRoutes.some(route => 
        req.path === route || req.path.startsWith(route)
    );
    
    if (isPublicRoute) {
        console.log('[AUTH] Rota pública, acesso permitido');
        return next();
    }
    
    // Verificar se há usuário na sessão
    if (req.session && req.session.user) {
        console.log('[AUTH] Usuário autenticado:', req.session.user.nome);
        req.user = req.session.user;
        return next();
    }
    
    console.log('[AUTH] Usuário não autenticado para rota:', req.path);
    
    // Para APIs, retornar JSON
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ 
            error: 'Não autenticado',
            redirect: '/login/'
        });
    }
    
    // Para páginas, redirecionar para login
    res.redirect('/login/?error=Sessão expirada ou não autenticado');
}

// Middleware para verificar se usuário está autenticado como professor
function requireProfessorAuth(req, res, next) {
    console.log('[AUTH] Verificando autenticação para professor...');
    console.log('[AUTH] Sessão completa:', req.session);
    console.log('[AUTH] Usuário na sessão:', req.session.user);
    
    // Verificar se há sessão e usuário
    if (!req.session) {
        console.log('[AUTH] Nenhuma sessão encontrada');
        return res.redirect('/login/?error=Sessão não encontrada');
    }
    
    if (!req.session.user) {
        console.log('[AUTH] Nenhum usuário na sessão');
        return res.redirect('/login/?error=Usuário não autenticado');
    }
    
    // Verificar se o usuário é professor
    if (req.session.user.tipo === 'professor') {
        console.log('[AUTH] Autenticação bem-sucedida para professor');
        next(); // Usuário é professor, pode continuar
    } else {
        console.log('[AUTH] Falha na autenticação. Tipo de usuário:', req.session.user.tipo);
        
        // Para requisições AJAX/API, retorne JSON em vez de redirecionar
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(401).json({ 
                error: 'Acesso não autorizado',
                redirect: '/login/?error=Acesso restrito a professores'
            });
        }
        // Redireciona para login se não estiver autenticado
        res.redirect('/login/?error=Acesso restrito a professores');
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
            console.error('Erro no processamento:', error);
        }
        setTimeout(() => this.process(), 100);
    }
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
            const placeholders = batch.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
            const values = batch.flat();
            const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
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

// Função para validar CPF
function isValidCPF(cpf) {
    // Remove caracteres não numéricos
    cpf = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cpf.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
    if (/^(\d)\1+$/.test(cpf)) return false;
    
    // Validação do CPF (algoritmo de verificação)
    let soma = 0;
    let resto;
    
    for (let i = 1; i <= 9; i++) 
        soma = soma + parseInt(cpf.substring(i-1, i)) * (11 - i);
    
    resto = (soma * 10) % 11;
    
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    
    soma = 0;
    for (let i = 1; i <= 10; i++) 
        soma = soma + parseInt(cpf.substring(i-1, i)) * (12 - i);
    
    resto = (soma * 10) % 11;
    
    if ((resto === 10) || (resto === 11)) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    
    return true;
}

// ===== ROTAS DA API =====
// API - Cadastro de usuários (SALVANDO NO ARQUIVO JSON)
app.post('/api/cadastro', async (req, res) => {
    const { nome, cpf, senha, tipo, turma } = req.body;
    
    console.log('=== TENTATIVA DE CADASTRO NO ARQUIVO JSON ===');
    console.log('Nome:', nome);
    console.log('CPF:', cpf);
    console.log('Tipo:', tipo);
    console.log('Turma:', turma);
    
    try {
        // Validar campos obrigatórios
        if (!nome || !cpf || !senha || !tipo) {
            return res.status(400).json({
                success: false,
                message: 'Todos os campos são obrigatórios'
            });
        }
        
        // Para alunos, a turma é obrigatória
        if (tipo === 'aluno' && !turma) {
            return res.status(400).json({
                success: false,
                message: 'Turma é obrigatória para alunos'
            });
        }
        
        // Validar CPF
        if (!isValidCPF(cpf)) {
            return res.status(400).json({
                success: false,
                message: 'CPF inválido'
            });
        }
        
        // Ler usuários existentes do arquivo
        const usuariosPath = path.join(__dirname, 'usuario.json');
        let usuarios = [];
        
        if (fs.existsSync(usuariosPath)) {
            const data = fs.readFileSync(usuariosPath, 'utf8');
            usuarios = JSON.parse(data);
        }
        
        // Verificar se o CPF já existe
        const existingUser = usuarios.find(u => u.cpf === cpf);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'Usuário já cadastrado com este CPF'
            });
        }
        
        // Criar novo usuário
        const novoUsuario = {
            id: uuidv4(),
            nome,
            cpf,
            senha,
            tipo,
            turma: tipo === 'aluno' ? turma : null,
            dataCadastro: new Date().toISOString()
        };
        
        // Adicionar ao array e salvar no arquivo
        usuarios.push(novoUsuario);
        fs.writeFileSync(usuariosPath, JSON.stringify(usuarios, null, 2));
        
        console.log('Usuário cadastrado com sucesso:', novoUsuario);
        
        res.json({
            success: true,
            message: 'Usuário cadastrado com sucesso!'
        });
        
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor: ' + error.message
        });
    }
});

// API - Autenticação (USANDO ARQUIVO usuario.json)
app.post('/api/auth/login', async (req, res) => {
    console.log('=== TENTATIVA DE LOGIN RECEBIDA ===');
    
    try {
        const { cpf, senha, tipo, turma } = req.body;
        
        console.log('Dados recebidos:', { cpf, tipo, turma });
        
        // Validar dados de entrada
        if (!cpf || !senha || !tipo) {
            console.log('Dados incompletos');
            return res.status(400).json({
                success: false,
                message: 'Todos os campos são obrigatórios'
            });
        }
        
        // Ler usuários do arquivo JSON
        const usuariosPath = path.join(__dirname, 'usuario.json');
        
        // Verificar se o arquivo existe
        if (!fs.existsSync(usuariosPath)) {
            console.log('Arquivo usuario.json não encontrado');
            return res.status(500).json({
                success: false,
                message: 'Sistema de autenticação não configurado'
            });
        }
        
        // Ler e parsear o arquivo
        const data = fs.readFileSync(usuariosPath, 'utf8');
        console.log('Conteúdo do arquivo usuario.json:', data.substring(0, 200) + '...');
        
        let usuarios = [];
        try {
            usuarios = JSON.parse(data);
            console.log('Número de usuários carregados:', usuarios.length);
        } catch (parseError) {
            console.error('Erro ao parsear usuario.json:', parseError);
            return res.status(500).json({
                success: false,
                message: 'Erro no arquivo de usuários'
            });
        }
        
        // Buscar usuário
        const usuario = usuarios.find(u => u.cpf === cpf && u.tipo === tipo);
        
        if (!usuario) {
            console.log('Usuário não encontrado para CPF:', cpf, 'e tipo:', tipo);
            return res.status(401).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }
        
        console.log('Usuário encontrado:', usuario.nome);
        
        // Verificar senha
        if (usuario.senha !== senha) {
            console.log('Senha incorreta para usuário:', usuario.nome);
            return res.status(401).json({
                success: false,
                message: 'Senha incorreta'
            });
        }
        
        // Verificar turma para alunos
        if (tipo === 'aluno' && usuario.turma !== turma) {
            console.log('Turma incorreta. Esperada:', usuario.turma, 'Recebida:', turma);
            return res.status(401).json({
                success: false,
                message: `Turma incorreta. Sua turma é ${usuario.turma}.`
            });
        }
        
        // Criar sessão (sem a senha)
        const userSession = { 
            id: usuario.id,
            nome: usuario.nome,
            cpf: usuario.cpf,
            tipo: usuario.tipo,
            turma: usuario.turma
        };
        
        req.session.regenerate((err) => {
            if (err) {
                console.error('Erro ao regenerar sessão:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Erro interno do servidor'
                });
            }
            
            req.session.user = userSession;
            
            console.log('Sessão criada com sucesso para:', userSession.nome);
            
            // SALVAR A SESSÃO ANTES DE RESPONDER
            req.session.save((err) => {
                if (err) {
                    console.error('Erro ao salvar sessão:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Erro interno do servidor'
                    });
                }
                
                // Enviar URLs completas com .html
                res.json({
                    success: true,
                    message: 'Login realizado com sucesso!',
                    user: userSession,
                    redirectUrl: tipo === 'aluno' ? '/aluno/aluno.html' : '/professor/professor.html'
                });
            });
        });
    } catch (error) {
        console.error('ERRO CRÍTICO NO LOGIN:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor: ' + error.message
        });
    }
});

// API - Verificar status de autenticação
app.get('/api/auth/check', (req, res) => {
    console.log('Verificando autenticação, sessão:', req.session.user);
    
    if (req.session.user) {
        res.json({
            isAuthenticated: true,
            user: req.session.user,
            redirectUrl: req.session.user.tipo === 'aluno' 
                ? '/aluno/aluno.html' 
                : '/professor/professor.html'
        });
    } else {
        res.status(401).json({
            isAuthenticated: false,
            message: 'Não autenticado'
        });
    }
});

// API - Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Erro ao fazer logout:', err);
            return res.status(500).json({ error: 'Erro ao fazer logout' });
        }
        res.json({ success: true, message: 'Logout realizado com sucesso' });
    });
});

// Rota para debug da sessão atual
app.get('/api/debug/session', (req, res) => {
    res.json({
        sessionID: req.sessionID,
        session: req.session,
        user: req.session?.user,
        headers: req.headers,
        cookies: req.cookies,
        activeSessions: Array.from(activeSessions.entries())
    });
});

// API - Verificar tentativa de prova
app.get('/api/exams/:examId/attempt/:studentCpf', async (req, res) => {
    try {
        const { examId, studentCpf } = req.params;
        const row = await db.get(
            `SELECT COUNT(*) as count FROM respostas 
             WHERE prova_id = ? AND aluno_cpf = ?`, [examId, studentCpf]
        );
        res.json({ attempted: row.count > 0 });
    } catch (err) {
        console.error('Erro ao verificar tentativa:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// API - Todas as provas
app.get('/api/exams', async (req, res) => {
    try {
        const rows = await db.all('SELECT * FROM provas ORDER BY data_criacao DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API - Prova específica
app.get('/api/exams/:id', async (req, res) => {
    try {
        const examId = req.params.id;
        const exam = await db.get('SELECT * FROM provas WHERE id = ?', [examId]);
        
        if (!exam) {
            return res.status(404).json({ error: 'Prova não encontrada' });
        }
        
        const questions = await db.all('SELECT * FROM questoes WHERE prova_id = ?', [examId]);
        const questionsWithAlternatives = [];
        
        if (questions.length === 0) {
            return res.json({...exam, questions: [] });
        }
        
        for (const question of questions) {
            const alternatives = await db.all('SELECT * FROM alternativas WHERE questao_id = ?', [question.id]);
            questionsWithAlternatives.push({...question, alternatives: alternatives || [] });
        }
        
        res.json({...exam, questions: questionsWithAlternatives });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API - Geração de link único
app.post('/api/gerar-link-unico', async (req, res) => {
    const { prova_id, aluno_cpf } = req.body;
    
    try {
        const row = await db.get(
            `SELECT * FROM links_unicos WHERE prova_id = ? AND aluno_cpf = ?`, 
            [prova_id, aluno_cpf]
        );
        
        if (row) {
            return res.json({
                link_unico: row.link_unico,
                message: 'Link único já existente'
            });
        } else {
            const linkUnico = uuidv4();
            await db.run(
                `INSERT INTO links_unicos (prova_id, aluno_cpf, link_unico, data_criacao) VALUES (?, ?, ?, datetime('now'))`, 
                [prova_id, aluno_cpf, linkUnico]
            );
            
            res.json({
                link_unico: linkUnico,
                message: 'Link único gerado com sucesso!'
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API - CRUD Provas
app.post('/api/provas', requireProfessorAuth, async(req, res) => {
    const { titulo, disciplina, data_limite, tempo_limite, descricao, questões, alunos } = req.body;
    const provaId = uuidv4();
    
    try {
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO provas (id, titulo, disciplina, professor_cpf, data_limite, tempo_limite, descricao) VALUES (?, ?, ?, ?, ?, ?, ?)`, [provaId, titulo, disciplina, 'professor_cpf_aqui', data_limite, tempo_limite, descricao],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        
        res.json({
            id: provaId,
            message: 'Prova criada com sucesso! Processamento em segundo plano iniciado.'
        });
        
        processingQueue.add(async() => {
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
                            index
                        ]);
                        
                        if (questao.tipo === 'multipla_escolha' && questao.alternativas) {
                            questao.alternativas.forEach((alt, altIndex) => {
                                alternativaData.push([
                                    uuidv4(),
                                    questaoId,
                                    alt.texto,
                                    alt.correta ? 1 : 0,
                                    altIndex
                                ]);
                            });
                        } else if (questao.tipo === 'verdadeiro_falso') {
                            alternativaData.push([
                                uuidv4(),
                                questaoId,
                                'Verdadeiro',
                                questao.resposta_correta === 'verdadeiro' ? 1 : 0,
                                0
                            ]);
                            alternativaData.push([
                                uuidv4(),
                                questaoId,
                                'Falso',
                                questao.resposta_correta === 'falso' ? 1 : 0,
                                1
                            ]);
                        }
                    });
                    
                    await batchInsert('questoes', ['id', 'prova_id', 'tipo', 'enunciado', 'valor', 'ordem'],
                        questaoData
                    );
                    
                    if (alternativaData.length > 0) {
                        await batchInsert('alternativas', ['id', 'questao_id', 'texto', 'correta', 'ordem'],
                            alternativaData
                        );
                    }
                }
                
                if (alunos && alunos.length > 0) {
                    const alunoData = alunos.map(cpf => [provaId, cpf]);
                    await batchInsert('provas_alunos', ['prova_id', 'aluno_cpf'], alunoData);
                }
                
                console.log(`Prova ${provaId} processada completamente em segundo plano`);
            } catch (error) {
                console.error('Erro no processamento em segundo plano:', error);
            }
        });
    } catch (error) {
        console.error('Erro ao criar prova:', error);
        res.status(500).json({ error: 'Erro ao criar prova' });
    }
});

// API - Salvar prova (compatibilidade)
app.post('/api/salvar-prova', async (req, res) => {
    const { title, description, duration, exam_date, questions } = req.body;
    console.log('Recebendo dados da prova:', { title, description, duration, exam_date, questions });
    
    try {
        if (!title || !duration || !exam_date) {
            return res.status(400).json({
                success: false,
                message: 'Título, duração e data são obrigatórios'
            });
        }
        
        const [day, month, year] = exam_date.split('/');
        const isoDate = `${year}-${month}-${day}`;
        const provaId = uuidv4();
        
        // Usar await com db.run
        await db.run(
            `INSERT INTO provas (id, titulo, disciplina, professor_cpf, data_limite, tempo_limite, descricao) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`, 
            [provaId, title, 'Geral', 'professor_cpf_aqui', isoDate, duration, description || '']
        );
        
        if (questions && questions.length > 0) {
            for (const [index, question] of questions.entries()) {
                const questaoId = uuidv4();
                
                await db.run(
                    `INSERT INTO questoes (id, prova_id, tipo, enunciado, valor, ordem) 
                     VALUES (?, ?, ?, ?, ?, ?)`, 
                    [questaoId, provaId, question.type, question.text, question.value || 1.0, index]
                );
                
                if ((question.type === 'multipla_escolha' || question.type === 'verdadeiro_falso') &&
                    question.alternatives) {
                    
                    for (const [altIndex, alternative] of question.alternatives.entries()) {
                        const isCorrect = question.type === 'verdadeiro_falso' ?
                            alternative === question.correctAnswer :
                            altIndex === question.correctAnswer;
                        
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
            message: 'Prova salva com sucesso!',
            examId: provaId
        });
        
    } catch (error) {
        console.error('Erro ao salvar prova:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor: ' + error.message
        });
    }
});

// API - Submeter respostas da prova
app.post('/api/exams/:examId/submit', async (req, res) => {
    const examId = req.params.id;
    const { studentCpf, answers } = req.body;
    
    console.log(`Recebendo respostas da prova ${examId} do aluno ${studentCpf}`);
    
    try {
        // Verificar se o aluno já fez a prova
        const row = await db.get(
            `SELECT COUNT(*) as count FROM respostas WHERE prova_id = ? AND aluno_cpf = ?`,
            [examId, studentCpf]
        );
        
        if (row.count > 0) {
            return res.status(400).json({ error: 'Você já realizou esta prova' });
        }
        
        // Salvar as respostas
        for (const answer of answers) {
            await db.run(
                `INSERT INTO respostas (id, prova_id, aluno_cpf, questao_id, resposta, correta) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [uuidv4(), examId, studentCpf, answer.questionId, answer.answer, answer.isCorrect ? 1 : 0]
            );
        }
        
        // Calcular nota
        const rows = await db.all(
            `SELECT correta FROM respostas WHERE prova_id = ? AND aluno_cpf = ?`,
            [examId, studentCpf]
        );
        
        const total = rows.length;
        const corretas = rows.filter(row => row.correta === 1).length;
        const nota = total > 0 ? (corretas / total * 10).toFixed(2) : 0;
        
        // Salvar nota
        await db.run(
            `INSERT INTO notas (id, prova_id, aluno_cpf, nota, data_submissao) VALUES (?, ?, ?, ?, datetime('now'))`,
            [uuidv4(), examId, studentCpf, nota]
        );
        
        res.json({
            success: true,
            message: 'Prova submetida com sucesso!',
            nota: nota
        });
        
    } catch (err) {
        console.error('Erro ao salvar respostas:', err);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rotas de autenticação de usuários
app.post('/api/usuarios/login', async (req, res) => {
    const { cpf, senha, tipo, turma } = req.body;
    
    try {
        // Buscar usuário no arquivo JSON
        const usuariosPath = path.join(__dirname, 'usuario.json');
        let usuarios = [];
        
        if (fs.existsSync(usuariosPath)) {
            const data = fs.readFileSync(usuariosPath, 'utf8');
            usuarios = JSON.parse(data);
        }
        
        const row = usuarios.find(u => u.cpf === cpf && u.tipo === tipo);
        
        if (!row) {
            return res.json({ success: false, message: 'Usuário não encontrado' });
        }
        
        if (row.senha !== senha) {
            return res.json({ success: false, message: 'Senha incorreta' });
        }
        
        if (row.turma !== turma) {
            return res.json({ success: false, message: 'Turma incorreta' });
        }
        
        // Login bem-sucedido
        res.json({
            success: true,
            usuario: {
                nome: row.nome,
                cpf: row.cpf,
                tipo: row.tipo,
                turma: row.turma
            }
        });
    } catch (err) {
        return res.json({ success: false, message: 'Erro no servidor' });
    }
});

app.post('/api/usuarios/cadastrar', async (req, res) => {
    const { nome, cpf, senha, tipo, turma } = req.body;
    
    try {
        // Ler usuários existentes do arquivo
        const usuariosPath = path.join(__dirname, 'usuario.json');
        let usuarios = [];
        
        if (fs.existsSync(usuariosPath)) {
            const data = fs.readFileSync(usuariosPath, 'utf8');
            usuarios = JSON.parse(data);
        }
        
        // Verificar se usuário já existe
        const row = usuarios.find(u => u.cpf === cpf);
        
        if (row) {
            return res.json({ success: false, message: 'CPF já cadastrado' });
        }
        
        // Criar novo usuário
        const id = crypto.randomBytes(16).toString('hex');
        const novoUsuario = {
            id,
            nome,
            cpf,
            senha,
            tipo,
            turma,
            dataCadastro: new Date().toISOString()
        };
        
        // Adicionar ao array e salvar no arquivo
        usuarios.push(novoUsuario);
        fs.writeFileSync(usuariosPath, JSON.stringify(usuarios, null, 2));
        
        res.json({ 
            success: true, 
            message: 'Usuário criado com sucesso',
            usuario: { nome, cpf, tipo, turma }
        });
    } catch (err) {
        return res.json({ success: false, message: 'Erro ao criar usuário' });
    }
});

// API - Verificar se usuário está logado
app.get('/api/auth/status', (req, res) => {
    if (req.session && req.session.user) {
        res.json({
            authenticated: true,
            user: req.session.user
        });
    } else {
        res.json({
            authenticated: false
        });
    }
});

// ===== ROTAS DE PÁGINAS HTML =====
// Rotas de Login (públicas)
app.get(['/', '/login', '/login/', '/login.html', '/aluno/login', '/aluno/login.html', '/professor/login', '/professor/login.html'], (req, res) => {
    console.log('[ROTA] Servindo página de login');
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

// Rotas do Aluno
app.get(['/aluno', '/aluno/dashboard', '/aluno/aluno.html', '/aluno/acesso', '/aluno/acesso/'], checkAuth, (req, res) => {
    if (req.user.tipo !== 'aluno') {
        return res.redirect('/login/?error=Acesso restrito a alunos');
    }
    console.log('[ROTA] Servindo página do aluno para:', req.user.nome);
    res.sendFile(path.join(__dirname, '../frontend/aluno/aluno.html'));
});

app.get(['/aluno/acesso/provas', '/aluno/acesso/provas.html', '/provas', '/provas.html'], checkAuth, (req, res) => {
    if (req.user.tipo !== 'aluno') {
        return res.redirect('/login/?error=Acesso restrito a alunos');
    }
    console.log('[ROTA] Servindo página de provas do aluno para:', req.user.nome);
    res.sendFile(path.join(__dirname, '../frontend/aluno/acesso/provas.html'));
});

// Rotas do Professor
app.get(['/professor', '/professor.html', '/professor/dashboard', '/professor/professor.html'], checkAuth, (req, res) => {
    if (req.user.tipo !== 'professor') {
        return res.redirect('/login/?error=Acesso restrito a professores');
    }
    console.log('[ROTA] Servindo página do professor para:', req.user.nome);
    res.sendFile(path.join(__dirname, '../frontend/professor/professor.html'));
});

app.get(['/professor/criar', '/professor/criarprova', '/professor/criarprova.html', '/criarprova.html'], checkAuth, (req, res) => {
    if (req.user.tipo !== 'professor') {
        return res.redirect('/login/?error=Acesso restrito a professores');
    }
    res.sendFile(path.join(__dirname, '../frontend/professor/criar/criarprova.html'));
});

app.get(['/professor/gerenciar', '/professor/gerenciar.html'], checkAuth, (req, res) => {
    if (req.user.tipo !== 'professor') {
        return res.redirect('/login/?error=Acesso restrito a professores');
    }
    res.sendFile(path.join(__dirname, '../frontend/professor/gerenciar/gerenciar.html'));
});

app.get(['/professor/resultados', '/professor/resultados.html'], checkAuth, (req, res) => {
    if (req.user.tipo !== 'professor') {
        return res.redirect('/login/?error=Acesso restrito a professores');
    }
    res.sendFile(path.join(__dirname, '../frontend/professor/resultados/resultados.html'));
});

// Rotas Institucionais
app.get(['/cadastro', '/cadastro/'], (req, res) => {
    console.log('[ROTA] Servindo página de cadastro');
    res.sendFile(path.join(__dirname, '../frontend/cadastro/cadastro.html'));
});

app.get('/contato', (req, res) => {
    console.log('[ROTA] Servindo página de contato');
    res.sendFile(path.join(__dirname, '../frontend/contato/contato.html'));
});

app.get('/politica', (req, res) => {
    console.log('[ROTA] Servindo página de política');
    res.sendFile(path.join(__dirname, '../frontend/politica/politica.html'));
});

app.get('/termos', (req, res) => {
    console.log('[ROTA] Servindo página de termos');
    res.sendFile(path.join(__dirname, '../frontend/termos/termos.html'));
});

// Rota para acesso via link único
app.get('/acesso-unico/:linkUnico', async (req, res) => {
    try {
        const { linkUnico } = req.params;
        const row = await db.get(
            `SELECT lu.*, p.titulo, p.data_limite 
             FROM links_unicos lu 
             JOIN provas p ON lu.prova_id = p.id 
             WHERE lu.link_unico = ? AND lu.utilizado = 0`, [linkUnico]
        );
        
        if (!row) {
            return res.status(404).send('Link inválido ou já utilizado');
        }
        
        const dataLimite = new Date(row.data_limite);
        const agora = new Date();
        if (agora > dataLimite) {
            return res.status(400).send('Prazo para realização da prova expirado');
        }
        
        await db.run(
            `UPDATE links_unicos SET utilizado = 1, data_utilizacao = datetime('now') WHERE link_unico = ?`, 
            [linkUnico]
        );
        
        res.sendFile(path.join(__dirname, '../frontend/aluno/acesso/prova-unica.html'));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rota para página de prova individual
app.get('/prova/:id', (req, res) => {
    const provaId = req.params.id;
    const token = req.query.token;
    
    if (!token) {
        return res.status(401).send('Acesso não autorizado. Token necessário.');
    }
    
    // Verificação simplificada do token
    console.log('Acesso à prova:', provaId, 'com token:', token);
    
    // Servir a página da prova
    res.sendFile(path.join(__dirname, '../frontend/aluno/acesso/prova.html'));
});

// ROTA CURINGA *.html - DEVE SER A ÚLTIMA ROTA
app.get('*.html', (req, res) => {
    const requestedPath = req.path;
    const filePath = path.join(__dirname, '../frontend', requestedPath);
    console.log('[ROTA] Buscando arquivo HTML:', filePath);
    if (fs.existsSync(filePath)) {
        console.log('[ROTA] Arquivo encontrado, enviando:', filePath);
        res.sendFile(filePath);
    } else {
        console.log('[ROTA] Arquivo não encontrado:', filePath);
        res.status(404).json({
            error: 'Página não encontrada',
            path: requestedPath,
            method: req.method
        });
    }
});

// ===== ROTAS DE SAÚDE DO SISTEMA =====
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        message: 'Servidor PROVA-ONLINE está funcionando!',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ===== MANIPULADORES DE ERRO =====
app.use((req, res) => {
    console.log('[ERRO] Rota não encontrada:', req.path);
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.path,
        method: req.method
    });
});

app.use((err, req, res, next) => {
    console.error('[ERRO] Erro interno:', err.stack);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
    });
});

// ===== INICIALIZAÇÃO DO SERVIDOR =====
// Criar arquivo de usuários com dados de teste se não existir
function initializeUserFile() {
    const usuariosPath = path.join(__dirname, 'usuario.json');
    
    if (!fs.existsSync(usuariosPath)) {
        const usuariosTeste = [
            {
                id: uuidv4(),
                nome: "Professor Teste",
                cpf: "12345678901",
                senha: "senha123",
                tipo: "professor",
                turma: null,
                dataCadastro: new Date().toISOString()
            },
            {
                id: uuidv4(),
                nome: "Aluno Teste",
                cpf: "10987654321",
                senha: "senha123",
                tipo: "aluno",
                turma: "3A",
                dataCadastro: new Date().toISOString()
            }
        ];
        
        fs.writeFileSync(usuariosPath, JSON.stringify(usuariosTeste, null, 2));
        console.log('✅ Arquivo usuario.json criado com usuários de teste');
    }
}

initializeDatabase().then(() => {
    initializeUserFile();
    
    app.listen(PORT, () => {
        console.log('🎓 PROVA-ONLINE rodando!');
        console.log(`📍 http://localhost:${PORT}`);
        console.log('📁 Servindo arquivos estáticos de:', path.join(__dirname, '../frontend'));
        console.log('✅ Rota /api/cadastro disponível');
        console.log('✅ Rota /api/auth/login disponível');
        console.log('✅ Rota /api/debug/session disponível para diagnóstico');
        console.log('⚡ Modo otimizado ativado - Processamento em lote e fila assíncrona');
        console.log('🔑 Usuários agora são armazenados no arquivo usuario.json');
        console.log('💾 Sessões agora são gerenciadas em memória com limpeza automática');
        console.log('📝 Exemplo de usuário para teste:');
        console.log('   Professor: CPF=12345678901, Senha=senha123, Tipo=professor');
        console.log('   Aluno: CPF=10987654321, Senha=senha123, Tipo=aluno, Turma=3A');
    });
}).catch(err => {
    console.error('Falha ao inicializar o banco de dados:', err);
});