const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Criar tabelas
db.serialize(() => {
    // Tabela de provas
    db.run(`CREATE TABLE IF NOT EXISTS provas (
        id TEXT PRIMARY KEY,
        titulo TEXT NOT NULL,
        disciplina TEXT NOT NULL,
        professor_id TEXT NOT NULL,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_limite DATETIME,
        tempo_limite INTEGER, -- em minutos
        descricao TEXT,
        status TEXT DEFAULT 'rascunho'
    )`);

    // Tabela de questões
    db.run(`CREATE TABLE IF NOT EXISTS questoes (
        id TEXT PRIMARY KEY,
        prova_id TEXT NOT NULL,
        tipo TEXT NOT NULL, -- multipla_escolha, verdadeiro_falso, dissertativa
        enunciado TEXT NOT NULL,
        valor DECIMAL(5,2) DEFAULT 1.0,
        ordem INTEGER NOT NULL,
        FOREIGN KEY (prova_id) REFERENCES provas (id) ON DELETE CASCADE
    )`);

    // Tabela de alternativas (para questões múltipla escolha)
    db.run(`CREATE TABLE IF NOT EXISTS alternativas (
        id TEXT PRIMARY KEY,
        questao_id TEXT NOT NULL,
        texto TEXT NOT NULL,
        correta BOOLEAN DEFAULT FALSE,
        ordem INTEGER NOT NULL,
        FOREIGN KEY (questao_id) REFERENCES questoes (id) ON DELETE CASCADE
    )`);

    // Tabela de alunos designados para provas
    db.run(`CREATE TABLE IF NOT EXISTS provas_alunos (
        prova_id TEXT NOT NULL,
        aluno_email TEXT NOT NULL,
        PRIMARY KEY (prova_id, aluno_email),
        FOREIGN KEY (prova_id) REFERENCES provas (id) ON DELETE CASCADE
    )`);

    console.log('Banco de dados inicializado com sucesso!');
});

module.exports = db;