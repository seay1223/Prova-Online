const express = require('express');
const path = require('path');
const db = require('./database');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Servir arquivos estáticos - configuração correta para sua estrutura
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));

// Middleware para log de requisições (útil para debug)
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Rotas principais
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

app.get('/aluno', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/aluno/aluno.html'));
});

app.get('/professor', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/professor/professor.html'));
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
            
            // Se for múltipla escolha, inserir alternativas
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
    const { alunos } = req.body; // Array de emails de alunos
    
    alunos.forEach(email => {
        db.run(
            `INSERT OR IGNORE INTO provas_alunos (prova_id, aluno_email) VALUES (?, ?)`,
            [req.params.id, email]
        );
    });
    
    res.json({ message: 'Alunos designados com sucesso!' });
});

// Rota para testar se o servidor está funcionando
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'online', 
        message: 'Servidor PROVA-ONLINE está funcionando!',
        timestamp: new Date().toISOString()
    });
});

// Middleware para tratamento de erros 404
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});

// Middleware para tratamento de erros gerais
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
    console.log('🎓 PROVA-ONLINE rodando!');
    console.log('📍 http://localhost:3000');
    console.log('📁 Servindo arquivos estáticos de:', path.join(__dirname, '../frontend'));
    console.log('📁 Servindo CSS de:', path.join(__dirname, '../frontend/css'));
})