import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Criar conexão com o banco de dados
const db = new sqlite3.Database(join(__dirname, 'database.sqlite'), (err) => {
    if (err) {
        console.error('Erro ao conectar com o banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
        initializeDatabase();
    }
});

// Função para inicializar o banco de dados com tabelas
function initializeDatabase() {
    // Tabela de usuários
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('aluno', 'professor')),
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabela de provas
    db.run(`CREATE TABLE IF NOT EXISTS provas (
        id TEXT PRIMARY KEY,
        titulo TEXT NOT NULL,
        disciplina TEXT,
        professor_id TEXT NOT NULL,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_limite DATETIME NOT NULL,
        tempo_limite INTEGER NOT NULL,
        descricao TEXT,
        status TEXT DEFAULT 'ativa' CHECK(status IN ('ativa', 'inativa', 'concluida'))
    )`);

    // Tabela de questões
    db.run(`CREATE TABLE IF NOT EXISTS questoes (
        id TEXT PRIMARY KEY,
        prova_id TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('multipla_escolha', 'verdadeiro_falso', 'dissertativa')),
        enunciado TEXT NOT NULL,
        valor REAL DEFAULT 1.0,
        ordem INTEGER DEFAULT 0,
        FOREIGN KEY (prova_id) REFERENCES provas (id) ON DELETE CASCADE
    )`);

    // Tabela de alternativas (para questões de múltipla escolha)
    db.run(`CREATE TABLE IF NOT EXISTS alternativas (
        id TEXT PRIMARY KEY,
        questao_id TEXT NOT NULL,
        texto TEXT NOT NULL,
        correta INTEGER DEFAULT 0 CHECK(correta IN (0, 1)),
        ordem INTEGER DEFAULT 0,
        FOREIGN KEY (questao_id) REFERENCES questoes (id) ON DELETE CASCADE
    )`);

    // Tabela de relação provas-alunos
    db.run(`CREATE TABLE IF NOT EXISTS provas_alunos (
        prova_id TEXT NOT NULL,
        aluno_email TEXT NOT NULL,
        data_designacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (prova_id, aluno_email),
        FOREIGN KEY (prova_id) REFERENCES provas (id) ON DELETE CASCADE
    )`);

    // Tabela de links únicos para acesso às provas
    db.run(`CREATE TABLE IF NOT EXISTS links_unicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prova_id TEXT NOT NULL,
        aluno_email TEXT NOT NULL,
        link_unico TEXT UNIQUE NOT NULL,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        utilizado INTEGER DEFAULT 0 CHECK(utilizado IN (0, 1)),
        data_utilizacao DATETIME,
        FOREIGN KEY (prova_id) REFERENCES provas (id) ON DELETE CASCADE
    )`);

    // Tabela de respostas dos alunos
    db.run(`CREATE TABLE IF NOT EXISTS respostas (
        id TEXT PRIMARY KEY,
        prova_id TEXT NOT NULL,
        aluno_email TEXT NOT NULL,
        questao_id TEXT NOT NULL,
        resposta TEXT NOT NULL,
        data_submissao DATETIME DEFAULT CURRENT_TIMESTAMP,
        pontuacao REAL,
        FOREIGN KEY (prova_id) REFERENCES provas (id) ON DELETE CASCADE,
        FOREIGN KEY (questao_id) REFERENCES questoes (id) ON DELETE CASCADE
    )`);

    // Inserir usuário professor padrão se não existir
    db.get("SELECT COUNT(*) as count FROM usuarios WHERE email = 'professor@escola.com'", (err, row) => {
        if (err) {
            console.error('Erro ao verificar usuário professor:', err);
            return;
        }
        
        if (row.count === 0) {
            db.run(
                "INSERT INTO usuarios (email, senha, nome, tipo) VALUES (?, ?, ?, ?)",
                ['professor@escola.com', '123456', 'Professor Admin', 'professor'],
                function(err) {
                    if (err) {
                        console.error('Erro ao criar usuário professor padrão:', err);
                    } else {
                        console.log('Usuário professor padrão criado: professor@escola.com / 123456');
                    }
                }
            );
        }
    });

    console.log('Tabelas do banco de dados verificadas/criadas com sucesso.');
}

export default db;