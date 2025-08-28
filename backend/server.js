import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import db from './database.js';

// Como __dirname não existe no ESM, você precisa definir:
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware para JSON e urlencoded com limites aumentados
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware para log de requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/js')));
app.use('/images', express.static(path.join(__dirname, '../frontend/images')));
app.use('/aluno', express.static(path.join(__dirname, '../frontend/aluno')));
app.use('/professor', express.static(path.join(__dirname, '../frontend/professor')));
app.use('/login', express.static(path.join(__dirname, '../frontend/login')));
app.use('/contato', express.static(path.join(__dirname, '../frontend/contato')));
app.use('/politica', express.static(path.join(__dirname, '../frontend/politica')));
app.use('/termos', express.static(path.join(__dirname, '../frontend/termos')));

// Caminhos estáticos para as páginas do professor - CORRIGIDOS
app.use('/professor/criar', express.static(path.join(__dirname, '../frontend/professor/criar')));
app.use('/professor/gerenciar', express.static(path.join(__dirname, '../frontend/professor/gerenciar')));
app.use('/professor/resultados', express.static(path.join(__dirname, '../frontend/professor/resultados')));

// Middleware de debug
app.use((req, res, next) => {
    console.log('📨 Recebida requisição:', {
        method: req.method,
        path: req.path,
        time: new Date().toLocaleTimeString()
    });
    next();
});

// ===== FUNÇÕES PARA OTIMIZAÇÃO =====

// Fila de processamento assíncrono para criação de provas
const processingQueue = {
    tasks: [],
    isProcessing: false,
    
    add(task) {
        this.tasks.push(task);
        if (!this.isProcessing) {
            this.process();
        }
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
            console.error('Erro no processamento da tarefa:', error);
        }
        
        // Processar próxima tarefa após um delay
        setTimeout(() => this.process(), 100);
    }
};

// Função para inserção em lote no banco de dados
function batchInsert(table, columns, data, batchSize = 50) {
    return new Promise((resolve, reject) => {
        const batches = [];
        for (let i = 0; i < data.length; i += batchSize) {
            batches.push(data.slice(i, i + batchSize));
        }
        
        let processed = 0;
        const processBatch = (batch) => {
            if (batch.length === 0) {
                resolve();
                return;
            }
            
            const placeholders = batch.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
            const values = batch.flat();
            
            const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
            
            db.run(sql, values, function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                
                processed += batch.length;
                console.log(`Inseridos ${processed}/${data.length} registros em ${table}`);
                
                // Processar próximo lote com pequeno delay
                setTimeout(() => processBatch(batches.shift()), 50);
            });
        };
        
        processBatch(batches.shift());
    });
}

// ===== ROTAS PRINCIPAIS (HTML) =====

// Rotas de login
app.get(['/', '/login', '/login.html', '/aluno/login', '/aluno/login.html', '/professor/login', '/professor/login.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

// Rotas do aluno
app.get(['/aluno', '/aluno/dashboard', '/aluno/acesso', '/aluno/acesso/'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/aluno/aluno.html'));
});

app.get(['/aluno/acesso/provas', '/aluno/acesso/provas.html', '/provas', '/provas.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/aluno/acesso/provas.html'));
});

// Rotas do professor - CORRIGIDAS
app.get(['/professor', '/professor/dashboard'], (req, res) => {
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

// Rotas de páginas institucionais
app.get('/contato', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/contato/contato.html'));
});

app.get('/politica', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/politica/politica.html'));
});

app.get('/termos', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/termos/termos.html'));
});

// ===== API ROUTES =====

// API - Login
app.post('/api/login', (req, res) => {
    const { email, senha, tipo } = req.body;

    db.get(
        `SELECT * FROM usuarios WHERE email = ? AND tipo = ?`,
        [email, tipo],
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

// API - Geração de link único para aluno
app.post('/api/gerar-link-unico', (req, res) => {
    const { prova_id, aluno_email } = req.body;

    db.get(
        `SELECT * FROM links_unicos WHERE prova_id = ? AND aluno_email = ?`,
        [prova_id, aluno_email],
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
                    `INSERT INTO links_unicos (prova_id, aluno_email, link_unico, data_criacao) VALUES (?, ?, ?, datetime('now'))`,
                    [prova_id, aluno_email, linkUnico],
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

// API - Geração de links únicos em lote (OTIMIZADA)
app.post('/api/gerar-links-unicos', async (req, res) => {
    const { prova_id, alunos } = req.body;

    try {
        // Verificar links existentes
        const placeholders = alunos.map(() => '?').join(',');
        const existingLinks = await new Promise((resolve, reject) => {
            db.all(
                `SELECT aluno_email, link_unico FROM links_unicos 
                 WHERE prova_id = ? AND aluno_email IN (${placeholders})`,
                [prova_id, ...alunos],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                }
            );
        });

        const existingMap = new Map(existingLinks.map(row => [row.aluno_email, row.link_unico]));
        const newLinks = [];
        const linksToCreate = [];

        alunos.forEach(email => {
            if (existingMap.has(email)) {
                newLinks.push({ email, link: existingMap.get(email), status: 'existente' });
            } else {
                const linkUnico = uuidv4();
                newLinks.push({ email, link: linkUnico, status: 'novo' });
                linksToCreate.push([prova_id, email, linkUnico, new Date().toISOString()]);
            }
        });

        // Criar novos links em lote
        if (linksToCreate.length > 0) {
            await batchInsert('links_unicos', 
                ['prova_id', 'aluno_email', 'link_unico', 'data_criacao'], 
                linksToCreate
            );
        }

        res.json({
            links: newLinks,
            message: 'Links processados com sucesso'
        });
    } catch (error) {
        console.error('Erro ao gerar links:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rota para acesso via link único
app.get('/acesso-unico/:linkUnico', (req, res) => {
    const { linkUnico } = req.params;

    db.get(
        `SELECT lu.*, p.titulo, p.data_limite 
         FROM links_unicos lu 
         JOIN provas p ON lu.prova_id = p.id 
         WHERE lu.link_unico = ? AND lu.utilizado = 0`,
        [linkUnico],
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
                `UPDATE links_unicos SET utilizado = 1, data_utilizacao = datetime('now') WHERE link_unico = ?`,
                [linkUnico],
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

// API - CRUD Provas (OTIMIZADA)
app.post('/api/provas', async (req, res) => {
    const { titulo, disciplina, data_limite, tempo_limite, descricao, questões, alunos } = req.body;
    const provaId = uuidv4();

    try {
        // Inserir prova principal de forma síncrona
        await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO provas (id, titulo, disciplina, professor_id, data_limite, tempo_limite, descricao) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [provaId, titulo, disciplina, 'professor@escola.com', data_limite, tempo_limite, descricao],
                function(err) {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });

        // Responder imediatamente ao professor
        res.json({ 
            id: provaId, 
            message: 'Prova creat with success! Processamento em segundo plano iniciado.' 
        });

        // Processar questões e alunos em segundo plano
        processingQueue.add(async () => {
            try {
                // Processar questões em lote
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
                        }
                    });
                    
                    await batchInsert('questoes', 
                        ['id', 'prova_id', 'tipo', 'enunciado', 'valor', 'ordem'], 
                        questaoData
                    );
                    
                    if (alternativaData.length > 0) {
                        await batchInsert('alternativas', 
                            ['id', 'questao_id', 'texto', 'correta', 'ordem'], 
                            alternativaData
                        );
                    }
                }
                
                // Processar alunos em lote
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

// Obter provas do aluno via query
app.get('/api/provas/aluno', (req, res) => {
    const alunoEmail = req.query.email || req.headers['x-user-email'];

    if (!alunoEmail) {
        return res.status(400).json({ error: 'Email do aluno não fornecido' });
    }

    db.all(
        `SELECT p.* FROM provas p 
         JOIN provas_alunos pa ON p.id = pa.prova_id 
         WHERE pa.aluno_email = ? ORDER BY p.data_criacao DESC`,
        [alunoEmail],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// Obter provas do professor
app.get('/api/provas', (req, res) => {
    db.all(
        `SELECT * FROM provas WHERE professor_id = 'professor@escola.com' ORDER BY data_criacao DESC`,
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// Obter provas do aluno via parámetro
app.get('/api/provas/aluno/:email', (req, res) => {
    const { email } = req.params;

    db.all(
        `SELECT p.* FROM provas p 
         JOIN provas_alunos pa ON p.id = pa.prova_id 
         WHERE pa.aluno_email = ? ORDER BY p.data_criacao DESC`,
        [email],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// Criar questões para uma prova (mantida para compatibilidade)
app.post('/api/provas/:id/questoes', (req, res) => {
    const { tipo, enunciado, valor, ordem, alternativas } = req.body;
    const questaoId = uuidv4();

    db.run(
        `INSERT INTO questoes (id, prova_id, tipo, enunciado, valor, ordem) VALUES (?, ?, ?, ?, ?, ?)`,
        [questaoId, req.params.id, tipo, enunciado, valor || 1.0, ordem],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (tipo === 'multipla_escolha' && Array.isArray(alternativas)) {
                alternativas.forEach((alt, index) => {
                    const altId = uuidv4();
                    db.run(
                        `INSERT INTO alternativas (id, questao_id, texto, correta, ordem) VALUES (?, ?, ?, ?, ?)`,
                        [altId, questaoId, alt.texto, alt.correta ? 1 : 0, index]
                    );
                });
            }

            res.json({ id: questaoId, message: 'Questão adicionada com sucesso!' });
        }
    );
});

// Associar alunos a uma prova (mantida para compatibilidade)
app.post('/api/provas/:id/alunos', (req, res) => {
    const { alunos } = req.body;

    alunos.forEach(email => {
        db.run(
            `INSERT OR IGNORE INTO provas_alunos (prova_id, aluno_email) VALUES (?, ?)`,
            [req.params.id, email]
        );
    });

    res.json({ message: 'Alunos designados com sucesso!' });
});

// Obter questões de uma prova com alternativas (se aplicável)
app.get('/api/provas/:id/questoes', (req, res) => {
    db.all(
        `SELECT * FROM questoes WHERE prova_id = ? ORDER BY ordem`,
        [req.params.id],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            const promises = rows.map(questao => {
                return new Promise((resolve) => {
                    if (questao.tipo === 'multipla_escolha') {
                        db.all(
                            `SELECT * FROM alternativas WHERE questao_id = ? ORDER BY ordem`,
                            [questao.id],
                            (err, alternativas) => {
                                questao.alternativas = alternativas || [];
                                resolve(questao);
                            }
                        );
                    } else {
                        resolve(questao);
                    }
                });
            });

            Promise.all(promises).then(questoesComAlternativas => {
                res.json(questoesComAlternativas);
            });
        }
    );
});

// Receber respostas do aluno para a prova
app.post('/api/provas/:id/respostas', (req, res) => {
    const { aluno_email, respostas } = req.body;

    const promises = respostas.map(resposta => {
        return new Promise((resolve, reject) => {
            const respostaId = uuidv4();
            db.run(
                `INSERT INTO respostas (id, prova_id, aluno_email, questao_id, resposta, data_submissao) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
                [respostaId, req.params.id, aluno_email, resposta.questao_id, resposta.resposta],
                function(err) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        });
    });

    Promise.all(promises)
        .then(() => {
            res.json({ message: 'Respostas enviadas com sucesso!' });
        })
        .catch(err => {
            res.status(500).json({ error: err.message });
        });
});

// API - Obter resultados de uma prova
app.get('/api/provas/:id/resultados', (req, res) => {
    const { id } = req.params;

    db.all(
        `SELECT r.aluno_email, q.enunciado, r.resposta, q.valor,
                CASE WHEN q.tipo = 'multipla_escolha' THEN 
                    (SELECT a.texto FROM alternativas a WHERE a.questao_id = q.id AND a.correta = 1)
                ELSE NULL END as resposta_correta
         FROM respostas r
         JOIN questoes q ON r.questao_id = q.id
         WHERE r.prova_id = ?
         ORDER BY r.aluno_email, q.ordem`,
        [id],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// Status e health check
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        message: 'Servidor PROVA-ONLINE está funcionando!',
        timestamp: new Date().toISOString()
    });
});

// Status do servidor com informações da fila
app.get('/api/status-detalhado', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        fila: {
            tarefas_pendentes: processingQueue.tasks.length,
            processando: processingQueue.isProcessing
        },
        memoria: process.memoryUsage()
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Middleware 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.path,
        method: req.method
    });
});

// Middleware erro geral
app.use((err, req, res, next) => {
    console.error('Erro:', err.stack);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message
    });
});

app.listen(PORT, () => {
    console.log('🎓 PROVA-ONLINE rodando!');
    console.log(`📍 http://localhost:${PORT}`);
    console.log('📁 Servindo arquivos estáticos de:', path.join(__dirname, '../frontend'));
    console.log('🔄 Reinicie o servidor com: node server.js');
    console.log('⚡ Modo otimizado ativado - Processamento em lote e fila assíncrona');
});