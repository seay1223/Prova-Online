const express = require('express');
const path = require('path');
const db = require('./database');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware para log de requisições
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Servir arquivos estáticos - CONFIGURAÇÃO CORRIGIDA
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));
app.use('/js', express.static(path.join(__dirname, '../frontend/js')));
app.use('/images', express.static(path.join(__dirname, '../frontend/images')));

// Servir arquivos estáticos para pastas específicas
app.use('/aluno', express.static(path.join(__dirname, '../frontend/aluno')));
app.use('/professor', express.static(path.join(__dirname, '../frontend/professor')));
app.use('/login', express.static(path.join(__dirname, '../frontend/login')));
app.use('/contato', express.static(path.join(__dirname, '../frontend/contato')));
app.use('/politica', express.static(path.join(__dirname, '../frontend/politica')));
app.use('/termos', express.static(path.join(__dirname, '../frontend/termos')));

app.get('/aluno/login.html', (req, res) => {
    console.log('📁 Servindo /aluno/login.html');
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

app.get('/professor/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

// ADICIONE ESTAS ROTAS PARA COMPATIBILIDADE
app.get('/aluno/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

app.get('/professor/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

// Middleware de debug (coloque no início, após os outros middlewares)
app.use((req, res, next) => {
    console.log('📨 Recebida requisição:', {
        method: req.method,
        path: req.path,
        query: req.query,
        time: new Date().toLocaleTimeString()
    });
    next();
});

// Rotas para login específico
app.get('/aluno/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

app.get('/professor/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

// Rotas para dashboards
app.get('/aluno', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/aluno/aluno.html'));
});

app.get('/aluno/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/aluno/aluno.html'));
});

app.get('/professor', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/professor/professor.html'));
});

app.get('/professor/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/professor/professor.html'));
});

// Rotas para páginas estáticas
app.get('/contato', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/contato/contato.html'));
});

app.get('/politica', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/politica/politica.html'));
});

app.get('/termos', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/termos/termos.html'));
});

// API - Autenticação
app.post('/api/login', (req, res) => {
    const { email, senha, tipo } = req.body;
    
    // Verificação simples (substitua por verificação real no banco)
    if ((tipo === 'aluno' && email.endsWith('@aluno.escola.com')) || 
        (tipo === 'professor' && email === 'professor@escola.com')) {
        
        if (senha === '123456') { // Senha padrão para teste
            res.json({ 
                success: true, 
                message: 'Login realizado com sucesso!',
                user: { email, tipo }
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
});

// API - CRUD de Provas
app.post('/api/provas', (req, res) => {
    const { titulo, disciplina, data_limite, tempo_limite, descricao } = req.body;
    const provaId = uuidv4();
    
    db.run(
        `INSERT INTO provas (id, titulo, disciplina, professor_id, data_limite, tempo_limite, descricao) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [provaId, titulo, disciplina, 'professor@escola.com', data_limite, tempo_limite, descricao],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: provaId, message: 'Prova criada com sucesso!' });
        }
    );
});

app.get('/api/provas', (req, res) => {
    db.all(`SELECT * FROM provas WHERE professor_id = 'professor@escola.com' ORDER BY data_criacao DESC`, 
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

app.get('/api/provas/aluno/:email', (req, res) => {
    const { email } = req.params;
    
    db.all(`SELECT p.* FROM provas p 
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

app.post('/api/provas/:id/questoes', (req, res) => {
    const { tipo, enunciado, valor, ordem, alternativas } = req.body;
    const questaoId = uuidv4();
    
    db.run(
        `INSERT INTO questoes (id, prova_id, tipo, enunciado, valor, ordem) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [questaoId, req.params.id, tipo, enunciado, valor || 1.0, ordem],
        function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (tipo === 'multipla_escolha' && alternativas) {
                alternativas.forEach((alt, index) => {
                    const altId = uuidv4();
                    db.run(
                        `INSERT INTO alternativas (id, questao_id, texto, correta, ordem) 
                         VALUES (?, ?, ?, ?, ?)`,
                        [altId, questaoId, alt.texto, alt.correta || false, index]
                    );
                });
            }
            
            res.json({ id: questaoId, message: 'Questão adicionada com sucesso!' });
        }
    );
});

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

// API - Questões e Respostas
app.get('/api/provas/:id/questoes', (req, res) => {
    db.all(`SELECT * FROM questoes WHERE prova_id = ? ORDER BY ordem`, 
        [req.params.id],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            // Buscar alternativas para questões de múltipla escolha
            const promises = rows.map(questao => {
                return new Promise((resolve) => {
                    if (questao.tipo === 'multipla_escolha') {
                        db.all(`SELECT * FROM alternativas WHERE questao_id = ? ORDER BY ordem`, 
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

// Rota de status
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'online', 
        message: 'Servidor PROVA-ONLINE está funcionando!',
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Middleware para tratamento de erros 404
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Rota não encontrada',
        path: req.path,
        method: req.method
    });
});

// Middleware para tratamento de erros gerais
app.use((err, req, res, next) => {
    console.error('Erro:', err.stack);
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: err.message
    });
});

app.listen(PORT, () => {
    console.log('🎓 PROVA-ONLINE rodando!');
    console.log('📍 http://localhost:3000');
    console.log('📁 Servindo arquivos estáticos de:', path.join(__dirname, '../frontend'));
    console.log('🔄 Reinicie o servidor com: node server.js');
});

module.exports = app;