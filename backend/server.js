import fs from 'fs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import db from './database/database.js';

// Configuração do __dirname para ESM
const __filename = fileURLToPath(
    import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// ===== MIDDLEWARES =====
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware de logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
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

// ===== ROTAS DE PÁGINAS HTML =====

// Rotas de Login
app.get(['/', '/login', '/login.html', '/aluno/login', '/aluno/login.html', '/professor/login', '/professor/login.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

// Rotas do Aluno
app.get(['/aluno', '/aluno/dashboard', '/aluno/dashboard.html', '/aluno/acesso', '/aluno/acesso/'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/aluno/aluno.html'));
});

app.get(['/aluno/acesso/provas', '/aluno/acesso/provas.html', '/provas', '/provas.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/aluno/acesso/provas.html'));
});

// Rotas do Professor
app.get(['/professor', '/professor/dashboard', '/professor/dashboard.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/professor/professor.html'));
});

app.get(['/professor/criar', '/professor/criarprova', '/professor/criarprova.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/professor/criar/criarprova.html'));
});

app.get(['/professor/gerenciar', '/professor/gerenciar.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/professor/gerenciar/gerenciar.html'));
});

app.get(['/professor/resultados', '/professor/resultados.html'], (req, res) => {
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

// Rota para arquivos HTML específicos do professor
app.get('/professor/:page.html', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, `../frontend/professor/${page}/${page}.html`);

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'Página não encontrada' });
    }
});

// Rota curinga para arquivos HTML - DEVE SER A ÚLTIMA ROTA
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

// ===== API ROUTES =====

// API - Autenticação (CORRIGIDA)
app.post('/api/auth/login', (req, res) => {
    const { email, senha, tipo, turma } = req.body;

    try {
        const credenciaisPath = path.join(__dirname, '../frontend/js/credenciais.js');

        if (!fs.existsSync(credenciaisPath)) {
            return res.status(500).json({
                success: false,
                message: 'Sistema em configuração'
            });
        }

        const fileContent = fs.readFileSync(credenciaisPath, 'utf8');

        // Extrair credenciais usando regex mais robusta
        const alunosMatch = fileContent.match(/alunos:\s*(\[[^\]]*\])/);
        const professoresMatch = fileContent.match(/professores:\s*(\[[^\]]*\])/);
        const senhaMatch = fileContent.match(/senhaPadrao:\s*['"]([^'"]+)['"]/);

        if (!alunosMatch || !professoresMatch || !senhaMatch) {
            return res.status(500).json({
                success: false,
                message: 'Configuração inválida'
            });
        }

        // Processar alunos
        let alunos = [];
        try {
            const alunosStr = alunosMatch[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"');
            alunos = JSON.parse(alunosStr);
        } catch (e) {
            console.error('Erro ao processar alunos:', e);
            return res.status(500).json({
                success: false,
                message: 'Formato de alunos inválido'
            });
        }

        // Processar professores
        let professores = [];
        try {
            const professoresStr = professoresMatch[1].replace(/'/g, '"');
            professores = JSON.parse(professoresStr);
        } catch (e) {
            console.error('Erro ao processar professores:', e);
            return res.status(500).json({
                success: false,
                message: 'Formato de professores inválido'
            });
        }

        const senhaPadrao = senhaMatch[1];

        // Verificar credenciais
        let isValid = false;
        let userData = {};

        if (tipo === 'aluno') {
            const aluno = alunos.find(a => a.email === email);
            isValid = aluno && senha === senhaPadrao;

            if (isValid) {
                // Verificar se a turma coincide
                if (aluno.turma !== turma) {
                    return res.status(401).json({
                        success: false,
                        message: `Você não está cadastrado na turma ${turma}. Sua turma é ${aluno.turma}.`
                    });
                }

                userData = {
                    id: email,
                    email: email,
                    name: email.split('@')[0],
                    tipo: tipo,
                    turma: aluno.turma
                };
            }
        } else if (tipo === 'professor') {
            isValid = professores.includes(email) && senha === senhaPadrao;

            if (isValid) {
                userData = {
                    id: email,
                    email: email,
                    name: email.split('@')[0],
                    tipo: tipo
                };
            }
        }

        if (isValid) {
            const token = crypto.randomBytes(32).toString('hex');

            res.json({
                success: true,
                message: 'Login realizado com sucesso!',
                token: token,
                user: userData
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Credenciais inválidas'
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

// API - Login (mantida para compatibilidade)
app.post('/api/login', (req, res) => {
    const { email, senha, tipo } = req.body;

    db.get(
        `SELECT * FROM usuarios WHERE email = ? AND tipo = ?`, [email, tipo],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (row) {
                if (senha === row.senha) {
                    return res.json({
                        success: true,
                        message: 'Login realizado com sucesso!',
                        user: { email, tipo }
                    });
                } else {
                    return res.status(401).json({ success: false, message: 'Senha incorreta' });
                }
            } else {
                return res.status(401).json({ success: false, message: 'Usuário não encontrado' });
            }
        }
    );
});

// API - Provas Disponíveis
app.get('/api/exams/available', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    db.all(
        `SELECT p.* 
         FROM provas p 
         WHERE p.data_limite > datetime('now')
         ORDER BY p.data_criacao DESC`,
        (err, rows) => {
            if (err) {
                console.error('Erro ao buscar provas:', err);
                return res.status(500).json({ error: 'Erro interno do servidor' });
            }
            res.json(rows);
        }
    );
});

// API - Verificar tentativa de prova
app.get('/api/exams/:examId/attempt/:studentId', (req, res) => {
    const { examId, studentId } = req.params;

    db.get(
        `SELECT COUNT(*) as count FROM respostas 
         WHERE prova_id = ? AND aluno_email = ?`, [examId, studentId],
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

// API - Cadastro de usuários
app.post('/api/cadastro-credenciais', (req, res) => {
    const { email, senha, tipo, turma } = req.body;

    try {
        const credenciaisPath = path.join(__dirname, '../frontend/js/credenciais.js');

        if (!fs.existsSync(credenciaisPath)) {
            return res.status(500).json({
                success: false,
                message: 'Arquivo de credenciais não encontrado'
            });
        }

        let fileContent = fs.readFileSync(credenciaisPath, 'utf8');

        // Verificar se o email já existe
        if (fileContent.includes(email)) {
            return res.status(400).json({
                success: false,
                message: 'Usuário já cadastrado'
            });
        }

        // Extrair a posição dos arrays
        const alunosIndex = fileContent.indexOf('alunos: [');
        const professoresIndex = fileContent.indexOf('professores: [');

        if (tipo === 'aluno' && alunosIndex !== -1) {
            const alunosEndIndex = fileContent.indexOf(']', alunosIndex);
            if (alunosEndIndex !== -1) {
                const before = fileContent.substring(0, alunosEndIndex);
                const after = fileContent.substring(alunosEndIndex);

                // Verificar se já existem alunos cadastrados
                const hasExistingAlunos = before.substring(alunosIndex).includes('{');
                const separator = hasExistingAlunos ? ',' : '';

                // Adicionar aluno com turma
                fileContent = before + separator + `\n    { email: '${email}', turma: '${turma}' }` + after;
            }
        } else if (tipo === 'professor' && professoresIndex !== -1) {
            const professoresEndIndex = fileContent.indexOf(']', professoresIndex);
            if (professoresEndIndex !== -1) {
                const before = fileContent.substring(0, professoresEndIndex);
                const after = fileContent.substring(professoresEndIndex);
                const hasExistingProfessores = before.includes("'") || before.includes('"');
                const comma = hasExistingProfessores ? ',' : '';

                fileContent = before + comma + `\n    '${email}'` + after;
            }
        } else {
            return res.status(500).json({
                success: false,
                message: 'Estrutura do arquivo de credenciais inválida'
            });
        }

        fs.writeFileSync(credenciaisPath, fileContent);

        res.json({
            success: true,
            message: 'Usuário cadastrado com sucesso!'
        });

    } catch (error) {
        console.error('Erro ao atualizar credenciais:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// API - Geração de link único
app.post('/api/gerar-link-unico', (req, res) => {
    const { prova_id, aluno_email } = req.body;

    db.get(
        `SELECT * FROM links_unicos WHERE prova_id = ? AND aluno_email = ?`, [prova_id, aluno_email],
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
                    `INSERT INTO links_unicos (prova_id, aluno_email, link_unico, data_criacao) VALUES (?, ?, ?, datetime('now'))`, [prova_id, aluno_email, linkUnico],
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
                `INSERT INTO provas (id, titulo, disciplina, professor_id, data_limite, tempo_limite, descricao) VALUES (?, ?, ?, ?, ?, ?, ?)`, [provaId, titulo, disciplina, 'professor@escola.com', data_limite, tempo_limite, descricao],
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
                    const alunoData = alunos.map(email => [provaId, email]);
                    await batchInsert('provas_alunos', ['prova_id', 'aluno_email'], alunoData);
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

    db.serialize(() => {
        db.run(
            `INSERT INTO provas (id, titulo, disciplina, professor_id, data_limite, tempo_limite, descricao) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`, [uuidv4(), title, 'Geral', 'professor@escola.com', isoDate, duration, description || ''],
            function(err) {
                if (err) {
                    console.error('Erro ao inserir prova:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Erro ao salvar prova: ' + err.message
                    });
                }

                const provaId = this.lastID ? this.lastID : uuidv4();

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

// Rota para acesso via link único
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

// ===== ROTAS DE SAÚDE DO SISTEMA =====
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        message: 'Servidor PROVA-ONLINE está funcionando!',
        timestamp: new Date().toISOString()
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
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
    console.log('🔄 Reinicie o servidor com: node server.js');
    console.log('⚡ Modo otimizado ativado - Processamento em lote e fila assíncrona');
});