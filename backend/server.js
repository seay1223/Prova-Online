import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import CREDENCIAIS from '../frontend/js/credenciais.js';
import db from './database.js';

// Como __dirname não existe no ESM, você precisa definir:
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware para JSON e urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Middleware de debug
app.use((req, res, next) => {
    console.log('📨 Recebida requisição:', {
        method: req.method,
        path: req.path,
        query: req.query,
        time: new Date().toLocaleTimeString()
    });
    next();
});

// Rotas principais (HTML)
app.get(['/', '/login', '/login.html', '/aluno/login', '/aluno/login.html', '/professor/login', '/professor/login.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

app.get(['/aluno', '/aluno/dashboard', '/aluno/acesso', '/aluno/acesso/'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/aluno/aluno.html'));
});

app.get(['/professor', '/professor/dashboard'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/professor/professor.html'));
});

app.get(['/aluno/acesso/provas', '/aluno/acesso/provas.html', '/provas', '/provas.html'], (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/aluno/acesso/provas.html'));
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

// API - Login
app.post('/api/login', (req, res) => {
    const { email, senha, tipo } = req.body;

    if (tipo === 'aluno' && CREDENCIAIS.alunos.includes(email)) {
        if (senha === CREDENCIAIS.senhaPadrao) {
            return res.json({ 
                success: true, 
                message: 'Login realizado com sucesso!',
                user: { email, tipo }
            });
        } else {
            return res.status(401).json({ success: false, message: 'Senha incorreta' });
        }
    } else if (tipo === 'professor' && CREDENCIAIS.professores.includes(email)) {
        if (senha === CREDENCIAIS.senhaPadrao) {
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

// API - CRUD Provas
app.post('/api/provas', (req, res) => {
    const { titulo, disciplina, data_limite, tempo_limite, descricao } = req.body;
    const provaId = uuidv4();

    db.run(
        `INSERT INTO provas (id, titulo, disciplina, professor_id, data_limite, tempo_limite, descricao) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [provaId, titulo, disciplina, 'professor@escola.com', data_limite, tempo_limite, descricao],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: provaId, message: 'Prova criada com sucesso!' });
        }
    );
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

// Obter provas do aluno via parâmetro
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

// Criar questões para uma prova
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

// Associar alunos a uma prova
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

// Status e health check
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
});
