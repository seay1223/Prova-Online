const express = require('express');
const path = require('path');
const db = require('./database');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

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

app.listen(PORT, () => {
    console.log('🎓 PROVA-ONLINE rodando!');
    console.log('📍 http://localhost:3000');
});