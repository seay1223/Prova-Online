import fs from 'fs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from './database/database.js';
import session from 'express-session';

// Configuração do __dirname para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = 3000;

// ===== MIDDLEWARES =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== CONFIGURAÇÃO DE SESSÕES =====
app.use(session({
    secret: 'prova-online-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));

// Middleware para debug de sessões
app.use((req, res, next) => {
    console.log('[SESSION] ID:', req.sessionID);
    console.log('[SESSION] User:', req.session.user);
    next();
});

// Middleware de logging detalhado
app.use((req, res, next) => {
    console.log(`[DEBUG] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
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
// Middleware para verificar se usuário está autenticado como professor
function requireProfessorAuth(req, res, next) {
    if (req.session && req.session.user && req.session.user.tipo === 'professor') {
        next(); // Usuário é professor, pode continuar
    } else {
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
        const processBatch = (batch) => {
            if (!batch || batch.length === 0) {
                resolve();
                return;
            }
            const placeholders = batch.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
            const values = batch.flat();
            const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
            db.run(sql, values, function(err) {
                if (err) return reject(err);
                processed += batch.length;
                console.log(`Inseridos ${processed}/${data.length} registros em ${table}`);
                setTimeout(() => processBatch(batches.shift()), 50);
            });
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
// Rota para buscar dados do usuário
app.get('/api/user/data', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }
        
        // Aqui você precisa implementar a verificação do token JWT
        // Por enquanto, vamos buscar pelo CPF armazenado no localStorage do navegador
        const userData = JSON.parse(req.headers.userdata || '{}');
        
        if (!userData.cpf) {
            return res.status(401).json({ error: 'Dados do usuário não encontrados' });
        }
        
        // Buscar usuário no banco de dados
        db.get("SELECT * FROM usuarios WHERE cpf = ?", [userData.cpf], (err, user) => {
            if (err) {
                console.error('Erro ao buscar usuário:', err);
                return res.status(500).json({ error: 'Erro interno do servidor' });
            }
            
            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }
            
            // Retornar dados do usuário (sem a senha)
            const { senha, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        });
        
    } catch (error) {
        console.error('Erro na rota /api/user/data:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// API - Cadastro de usuários
app.post('/api/cadastro', (req, res) => {
    const { nome, cpf, senha, tipo, turma } = req.body;
    
    console.log('=== TENTATIVA DE CADASTRO ===');
    console.log('Nome:', nome);
    console.log('CPF:', cpf);
    console.log('Tipo:', tipo);
    console.log('Turma:', turma);
    
    // Validar CPF
    if (!isValidCPF(cpf)) {
        return res.status(400).json({
            success: false,
            message: 'CPF inválido'
        });
    }
    
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
    
    try {
        const usuariosPath = path.join(__dirname, 'usuarios.json');
        let usuarios = [];
        
        // Carregar usuários existentes se o arquivo existir
        if (fs.existsSync(usuariosPath)) {
            const data = fs.readFileSync(usuariosPath, 'utf8');
            usuarios = JSON.parse(data);
        }
        
        // Verificar se o CPF já existe
        if (usuarios.find(u => u.cpf === cpf)) {
            return res.status(400).json({
                success: false,
                message: 'Usuário já cadastrado com este CPF'
            });
        }
        
        // Adicionar novo usuário
        const novoUsuario = {
            id: uuidv4(),
            nome: nome,
            cpf: cpf,
            senha: senha,
            tipo: tipo,
            turma: tipo === 'aluno' ? turma : null,
            dataCadastro: new Date().toISOString()
        };
        
        usuarios.push(novoUsuario);
        
        // Salvar no arquivo JSON
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

// API - Autenticação (COM SESSÕES)
app.post('/api/auth/login', (req, res) => {
    const { cpf, senha, tipo, turma } = req.body;
    
    console.log('=== TENTATIVA DE LOGIN COM SESSÃO ===');
    console.log('CPF:', cpf);
    console.log('Tipo:', tipo);
    console.log('Turma:', turma);
    
    try {
        const usuariosPath = path.join(__dirname, 'usuarios.json');
        
        if (!fs.existsSync(usuariosPath)) {
            return res.status(500).json({
                success: false,
                message: 'Sistema em configuração'
            });
        }
        
        const fileContent = fs.readFileSync(usuariosPath, 'utf8');
        const usuarios = JSON.parse(fileContent);
        
        const usuario = usuarios.find(u => u.cpf === cpf && u.tipo === tipo);
        
        if (usuario) {
            if (usuario.senha === senha) {
                if (tipo === 'aluno' && usuario.turma !== turma) {
                    return res.status(401).json({
                        success: false,
                        message: `Turma incorreta. Sua turma é ${usuario.turma}.`
                    });
                }
                
                // SALVAR NA SESSÃO (remover senha por segurança)
                const userSession = { ...usuario };
                delete userSession.senha;
                
                req.session.user = userSession;
                req.session.save((err) => {
                    if (err) {
                        console.error('Erro ao salvar sessão:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'Erro interno'
                        });
                    }
                    
                    console.log('Sessão salva:', req.session.user);
                    
                    res.json({
                        success: true,
                        message: 'Login realizado com sucesso!',
                        user: userSession,
                        redirectUrl: tipo === 'aluno' ? '/aluno' : '/professor'
                    });
                });
            } else {
                res.status(401).json({
                    success: false,
                    message: 'Senha incorreta'
                });
            }
        } else {
            res.status(401).json({
                success: false,
                message: 'Usuário não encontrado'
            });
        }
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// API - Verificar sessão
app.get('/api/auth/check', (req, res) => {
    if (req.session && req.session.user) {
        res.json({ 
            authenticated: true, 
            user: req.session.user 
        });
    } else {
        res.json({ authenticated: false });
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

// API - Verificar tentativa de prova (ATUALIZADA PARA CPF)
app.get('/api/exams/:examId/attempt/:studentCpf', (req, res) => {
    const { examId, studentCpf } = req.params;
    db.get(
        `SELECT COUNT(*) as count FROM respostas 
         WHERE prova_id = ? AND aluno_cpf = ?`, [examId, studentCpf],
        (err, row) => {
            if (err) {
                console.error('Erro ao verificar tentativa:', err);
                return res.status(500).json({ error: 'Erro interno do servidor' });
            }
            res.json({ attempted: row.count > 0 });
        }
    );
});

// API - Todas as provas
app.get('/api/exams', (req, res) => {
    db.all('SELECT * FROM provas ORDER BY data_criacao DESC', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// API - Prova específica
app.get('/api/exams/:id', (req, res) => {
    const examId = req.params.id;
    db.get('SELECT * FROM provas WHERE id = ?', [examId], (err, exam) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!exam) {
            return res.status(404).json({ error: 'Prova não encontrada' });
        }
        db.all('SELECT * FROM questoes WHERE prova_id = ?', [examId], (err, questions) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            const questionsWithAlternatives = [];
            let processed = 0;
            if (questions.length === 0) {
                return res.json({...exam, questions: [] });
            }
            questions.forEach((question, index) => {
                db.all('SELECT * FROM alternativas WHERE questao_id = ?', [question.id], (err, alternatives) => {
                    if (err) {
                        console.error('Erro ao buscar alternativas:', err);
                    }
                    questionsWithAlternatives.push({...question, alternatives: alternatives || [] });
                    processed++;
                    if (processed === questions.length) {
                        res.json({...exam, questions: questionsWithAlternatives });
                    }
                });
            });
        });
    });
});

// API - Geração de link único (ATUALIZADA PARA CPF)
app.post('/api/gerar-link-unico', (req, res) => {
    const { prova_id, aluno_cpf } = req.body;
    db.get(
        `SELECT * FROM links_unicos WHERE prova_id = ? AND aluno_cpf = ?`, [prova_id, aluno_cpf],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (row) {
                return res.json({
                    link_unico: row.link_unico,
                    message: 'Link único já existente'
                });
            } else {
                const linkUnico = uuidv4();
                db.run(
                    `INSERT INTO links_unicos (prova_id, aluno_cpf, link_unico, data_criacao) VALUES (?, ?, ?, datetime('now'))`, [prova_id, aluno_cpf, linkUnico],
                    function(err) {
                        if (err) {
                            return res.status(500).json({ error: err.message });
                        }
                        res.json({
                            link_unico: linkUnico,
                            message: 'Link único gerado com sucesso!'
                        });
                    }
                );
            }
        }
    );
});

// API - CRUD Provas
app.post('/api/provas', async(req, res) => {
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
app.post('/api/salvar-prova', (req, res) => {
    const { title, description, duration, exam_date, questions } = req.body;
    console.log('Recebendo dados da prova:', { title, description, duration, exam_date, questions });
    
    if (!title || !duration || !exam_date) {
        return res.status(400).json({
            success: false,
            message: 'Título, duração e data são obrigatórios'
        });
    }
    
    const [day, month, year] = exam_date.split('/');
    const isoDate = `${year}-${month}-${day}`;
    const provaId = uuidv4();
    
    db.serialize(() => {
        db.run(
            `INSERT INTO provas (id, titulo, disciplina, professor_cpf, data_limite, tempo_limite, descricao) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`, [provaId, title, 'Geral', 'professor_cpf_aqui', isoDate, duration, description || ''],
            function(err) {
                if (err) {
                    console.error('Erro ao inserir prova:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Erro ao salvar prova: ' + err.message
                    });
                }
                
                if (questions && questions.length > 0) {
                    let questionsProcessed = 0;
                    questions.forEach((question, index) => {
                        const questaoId = uuidv4();
                        db.run(
                            `INSERT INTO questoes (id, prova_id, tipo, enunciado, valor, ordem) 
                             VALUES (?, ?, ?, ?, ?, ?)`, [questaoId, provaId, question.type, question.text, question.value || 1.0, index],
                            function(err) {
                                if (err) {
                                    console.error('Erro ao inserir questão:', err);
                                    return;
                                }
                                
                                if ((question.type === 'multipla_escolha' || question.type === 'verdadeiro_falso') &&
                                    question.alternatives) {
                                    question.alternatives.forEach((alternative, altIndex) => {
                                        const isCorrect = question.type === 'verdadeiro_falso' ?
                                            alternative === question.correctAnswer :
                                            altIndex === question.correctAnswer;
                                        db.run(
                                            `INSERT INTO alternativas (id, questao_id, texto, correta, ordem) 
                                             VALUES (?, ?, ?, ?, ?)`, [uuidv4(), questaoId, alternative, isCorrect ? 1 : 0, altIndex]
                                        );
                                    });
                                }
                                
                                questionsProcessed++;
                                if (questionsProcessed === questions.length) {
                                    res.json({
                                        success: true,
                                        message: 'Prova salva com sucesso!',
                                        examId: provaId
                                    });
                                }
                            }
                        );
                    });
                } else {
                    res.json({
                        success: true,
                        message: 'Prova salva com sucesso!',
                        examId: provaId
                    });
                }
            }
        );
    });
});

// API - Submeter respostas da prova
app.post('/api/exams/:examId/submit', (req, res) => {
    const examId = req.params.id;
    const { studentCpf, answers } = req.body;
    
    console.log(`Recebendo respostas da prova ${examId} do aluno ${studentCpf}`);
    
    // Verificar se o aluno já fez a prova
    db.get(
        `SELECT COUNT(*) as count FROM respostas WHERE prova_id = ? AND aluno_cpf = ?`,
        [examId, studentCpf],
        (err, row) => {
            if (err) {
                console.error('Erro ao verificar tentativa:', err);
                return res.status(500).json({ error: 'Erro interno do servidor' });
            }
            
            if (row.count > 0) {
                return res.status(400).json({ error: 'Você já realizou esta prova' });
            }
          
            // Salvar as respostas
            const respostaData = answers.map(answer => [
                uuidv4(),
                examId,
                studentCpf,
                answer.questionId,
                answer.answer,
                answer.isCorrect ? 1 : 0
            ]);
            
            batchInsert('respostas', ['id', 'prova_id', 'aluno_cpf', 'questao_id', 'resposta', 'correta'], respostaData)
                .then(() => {
                    // Calcular nota
                    db.all(
                        `SELECT correta FROM respostas WHERE prova_id = ? AND aluno_cpf = ?`,
                        [examId, studentCpf],
                        (err, rows) => {
                            if (err) {
                                console.error('Erro ao calcular nota:', err);
                                return res.status(500).json({ error: 'Erro interno do servidor' });
                            }
                            
                            const total = rows.length;
                            const corretas = rows.filter(row => row.correta === 1).length;
                            const nota = (corretas / total * 10).toFixed(2);
                            
                            // Salvar nota
                            db.run(
                                `INSERT INTO notas (id, prova_id, aluno_cpf, nota, data_submissao) VALUES (?, ?, ?, ?, datetime('now'))`,
                                [uuidv4(), examId, studentCpf, nota],
                                (err) => {
                                    if (err) {
                                        console.error('Erro ao salvar nota:', err);
                                        return res.status(500).json({ error: 'Erro interno do servidor' });
                                    }
                                    
                                    res.json({
                                        success: true,
                                        message: 'Prova submetida com sucesso!',
                                        nota: nota
                                    });
                                }
                            );
                        }
                    );
                })
                .catch(err => {
                    console.error('Erro ao salvar respostas:', err);
                    res.status(500).json({ error: 'Erro interno do servidor' });
                });
        }
    );
});

// Rotas de autenticação de usuários
app.post('/api/usuarios/login', (req, res) => {
    const { cpf, senha, tipo, turma } = req.body;
    
    db.get("SELECT * FROM usuarios WHERE cpf = ? AND tipo = ?", [cpf, tipo], (err, row) => {
        if (err) {
            return res.json({ success: false, message: 'Erro no servidor' });
        }
        
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
    });
});

app.post('/api/usuarios/cadastrar', (req, res) => {
    const { nome, cpf, senha, tipo, turma } = req.body;
    
    // Verificar se usuário já existe
    db.get("SELECT * FROM usuarios WHERE cpf = ?", [cpf], (err, row) => {
        if (err) {
            return res.json({ success: false, message: 'Erro no servidor' });
        }
        
        if (row) {
            return res.json({ success: false, message: 'CPF já cadastrado' });
        }
        
        // Criar novo usuário
        const id = require('crypto').randomBytes(16).toString('hex');
        db.run(
            "INSERT INTO usuarios (id, nome, cpf, senha, tipo, turma) VALUES (?, ?, ?, ?, ?, ?)",
            [id, nome, cpf, senha, tipo, turma],
            function(err) {
                if (err) {
                    return res.json({ success: false, message: 'Erro ao criar usuário' });
                }
                
                res.json({ 
                    success: true, 
                    message: 'Usuário criado com sucesso',
                    usuario: { nome, cpf, tipo, turma }
                });
            }
        );
    });
});

// ===== ROTAS DE PÁGINAS HTML =====
// Rotas de Login (públicas) - Incluindo versão com barra e parâmetros
app.get(['/', '/login', '/login/', '/login.html', '/aluno/login', '/aluno/login.html', '/professor/login', '/professor/login.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

// Rotas do Aluno
app.get(['/aluno', '/aluno/dashboard', '/aluno/dashboard.html', '/aluno/acesso', '/aluno/acesso/'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/aluno/aluno.html'));
});

app.get(['/aluno/acesso/provas', '/aluno/acesso/provas.html', '/provas', '/provas.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/aluno/acesso/provas.html'));
});

// ===== ROTAS DO PROFESSOR (PROTEGIDAS) =====
// Todas as rotas do professor agora estão protegidas com requireProfessorAuth
app.get(['/professor', '/professor.html', '/professor/dashboard', '/professor/dashboard.html'], requireProfessorAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/professor/professor.html'));
});

app.get(['/professor/criar', '/professor/criarprova', '/professor/criarprova.html', '/criarprova.html'], requireProfessorAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/professor/criar/criarprova.html'));
});

app.get(['/professor/gerenciar', '/professor/gerenciar.html'], requireProfessorAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/professor/gerenciar/gerenciar.html'));
});

app.get(['/professor/resultados', '/professor/resultados.html'], requireProfessorAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/professor/resultados/resultados.html'));
});

// Rotas Institucionais
app.get(['/cadastro', '/cadastro/'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/cadastro/cadastro.html'));
});

app.get('/contato', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/contato/contato.html'));
});

app.get('/politica', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/politica/politica.html'));
});

app.get('/termos', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/termos/termos.html'));
});

// Rota para acesso via link único (ATUALIZADA PARA CPF)
app.get('/acesso-unico/:linkUnico', (req, res) => {
    const { linkUnico } = req.params;
    db.get(
        `SELECT lu.*, p.titulo, p.data_limite 
         FROM links_unicos lu 
         JOIN provas p ON lu.prova_id = p.id 
         WHERE lu.link_unico = ? AND lu.utilizado = 0`, [linkUnico],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                return res.status(404).send('Link inválido ou já utilizado');
            }
            
            const dataLimite = new Date(row.data_limite);
            const agora = new Date();
            if (agora > dataLimite) {
                return res.status(400).send('Prazo para realização da prova expirado');
            }
            
            db.run(
                `UPDATE links_unicos SET utilizado = 1, data_utilizacao = datetime('now') WHERE link_unico = ?`, [linkUnico],
                function(err) {
                    if (err) {
                        console.error('Erro ao marcar link como utilizado:', err);
                    }
                    res.sendFile(path.join(__dirname, '../frontend/aluno/acesso/prova-unica.html'));
                }
            );
        }
    );
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
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
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
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.path,
        method: req.method
    });
});

app.use((err, req, res, next) => {
    console.error('Erro:', err.stack);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
    });
});

// ===== INICIALIZAÇÃO DO SERVIDOR =====
app.listen(PORT, () => {
    console.log('🎓 PROVA-ONLINE rodando!');
    console.log(`📍 http://localhost:${PORT}`);
    console.log('📁 Servindo arquivos estáticos de:', path.join(__dirname, '../frontend'));
    console.log('✅ Rota /api/cadastro disponível');
    console.log('✅ Rota /api/auth/login disponível');
    console.log('⚡ Modo otimizado ativado - Processamento em lote e fila assíncrona');
});