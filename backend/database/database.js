import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

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
    // Habilitar chaves estrangeiras
    db.run("PRAGMA foreign_keys = ON");
    
    // Tabela de usuários
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        nome TEXT NOT NULL,
        cpf TEXT UNIQUE NOT NULL,
        senha TEXT NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('aluno', 'professor')),
        turma TEXT,
        data_cadastro DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Tabela de provas
    db.run(`CREATE TABLE IF NOT EXISTS provas (
        id TEXT PRIMARY KEY,
        titulo TEXT NOT NULL,
        disciplina TEXT,
        professor_cpf TEXT NOT NULL,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_limite DATETIME NOT NULL,
        tempo_limite INTEGER NOT NULL,
        descricao TEXT,
        status TEXT DEFAULT 'ativa' CHECK(status IN ('ativa', 'inativa', 'concluida')),
        FOREIGN KEY (professor_cpf) REFERENCES usuarios (cpf)
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
        aluno_cpf TEXT NOT NULL,
        data_designacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (prova_id, aluno_cpf),
        FOREIGN KEY (prova_id) REFERENCES provas (id) ON DELETE CASCADE,
        FOREIGN KEY (aluno_cpf) REFERENCES usuarios (cpf)
    )`);
    
    // Tabela de links únicos para acesso às provas
    db.run(`CREATE TABLE IF NOT EXISTS links_unicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prova_id TEXT NOT NULL,
        aluno_cpf TEXT NOT NULL,
        link_unico TEXT UNIQUE NOT NULL,
        data_criacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        utilizado INTEGER DEFAULT 0 CHECK(utilizado IN (0, 1)),
        data_utilizacao DATETIME,
        FOREIGN KEY (prova_id) REFERENCES provas (id) ON DELETE CASCADE,
        FOREIGN KEY (aluno_cpf) REFERENCES usuarios (cpf)
    )`);
    
    // Tabela de respostas dos alunos
    db.run(`CREATE TABLE IF NOT EXISTS respostas (
        id TEXT PRIMARY KEY,
        prova_id TEXT NOT NULL,
        aluno_cpf TEXT NOT NULL,
        questao_id TEXT NOT NULL,
        resposta TEXT NOT NULL,
        correta INTEGER DEFAULT 0 CHECK(correta IN (0, 1)),
        data_submissao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (prova_id) REFERENCES provas (id) ON DELETE CASCADE,
        FOREIGN KEY (questao_id) REFERENCES questoes (id) ON DELETE CASCADE,
        FOREIGN KEY (aluno_cpf) REFERENCES usuarios (cpf)
    )`);
    
    // Tabela de notas dos alunos
    db.run(`CREATE TABLE IF NOT EXISTS notas (
        id TEXT PRIMARY KEY,
        prova_id TEXT NOT NULL,
        aluno_cpf TEXT NOT NULL,
        nota REAL NOT NULL,
        data_submissao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (prova_id) REFERENCES provas (id) ON DELETE CASCADE,
        FOREIGN KEY (aluno_cpf) REFERENCES usuarios (cpf)
    )`);
    
    syncUsersToLocalStorage();
    console.log('Tabelas do banco de dados verificadas/criadas com sucesso.');
}

// Função para sincronizar usuários do SQLite (REMOVER localStorage)
function syncUsersToLocalStorage() {
    db.all("SELECT * FROM usuarios", (err, rows) => {
        if (err) {
            console.error('Erro ao buscar usuários do SQLite:', err);
            return;
        }
        
        console.log(`Encontrados ${rows.length} usuários no banco de dados`);
        // Apenas loga a informação, não tenta usar localStorage
    });
}

// Função para gerar ID único
function generateId() {
    return crypto.randomBytes(16).toString('hex');
}

// Inserir usuário professor padrão se não existir
db.get("SELECT COUNT(*) as count FROM usuarios WHERE cpf = ?", ['12345678900'], (err, row) => {
    if (err) {
        console.error('Erro ao verificar usuário professor:', err);
        return;
    }
    
    if (row.count === 0) {
        const professorId = generateId();
        db.run(
            "INSERT INTO usuarios (id, nome, cpf, senha, tipo) VALUES (?, ?, ?, ?, ?)",
            [professorId, 'Professor Admin', '12345678900', '123456', 'professor'],
            function(err) {
                if (err) {
                    console.error('Erro ao criar usuário professor padrão:', err);
                } else {
                    console.log('Usuário professor padrão criado: CPF 12345678900 / senha 123456');
                    syncUsersToLocalStorage();
                }
            }
        );
    } else {
        console.log('Usuário professor já existe');
    }
});

// Exportar funções para manipulação de dados
export default {
    // Usuários
    createUser: (userData, callback) => {
        const id = generateId();
        db.run(
            "INSERT INTO usuarios (id, nome, cpf, senha, tipo, turma) VALUES (?, ?, ?, ?, ?, ?)",
            [id, userData.nome, userData.cpf, userData.senha, userData.tipo, userData.turma],
            function(err) {
                if (err) {
                    callback(err);
                } else {
                    syncUsersToLocalStorage();
                    callback(null, { id, ...userData });
                }
            }
        );
    },
    
    getUserByCpf: (cpf, callback) => {
        db.get("SELECT * FROM usuarios WHERE cpf = ?", [cpf], callback);
    },
    
    getAllUsers: (callback) => {
        db.all("SELECT * FROM usuarios", callback);
    },
    
    // Provas
    createProva: (provaData, callback) => {
        const id = generateId();
        db.run(
            "INSERT INTO provas (id, titulo, disciplina, professor_cpf, data_limite, tempo_limite, descricao) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [id, provaData.titulo, provaData.disciplina, provaData.professor_cpf, provaData.data_limite, provaData.tempo_limite, provaData.descricao],
            function(err) {
                callback(err, { id, ...provaData });
            }
        );
    },
    
    getProvaById: (id, callback) => {
        db.get("SELECT * FROM provas WHERE id = ?", [id], callback);
    },
    
    // Exportar a conexão do banco diretamente também
    db: db
};

export { db };