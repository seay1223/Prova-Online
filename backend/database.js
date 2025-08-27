import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import CREDENCIAIS from '../frontend/js/credenciais.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new sqlite3.Database(join(__dirname, 'database.db'), (err) => {
  if (err) {
    console.error('Erro ao conectar com o banco de dados:', err);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    inicializarTabelas();
  }
});

function inicializarTabelas() {
  db.serialize(() => {
    // Criação das tabelas normais
    db.exec(`
      CREATE TABLE IF NOT EXISTS provas (
        id TEXT PRIMARY KEY,
        titulo TEXT,
        disciplina TEXT,
        professor_id TEXT,
        data_limite TEXT,
        tempo_limite INTEGER,
        descricao TEXT,
        data_criacao TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS questoes (
        id TEXT PRIMARY KEY,
        prova_id TEXT,
        tipo TEXT,
        enunciado TEXT,
        valor REAL,
        ordem INTEGER
      );

      CREATE TABLE IF NOT EXISTS alternativas (
        id TEXT PRIMARY KEY,
        questao_id TEXT,
        texto TEXT,
        correta INTEGER,
        ordem INTEGER
      );

      CREATE TABLE IF NOT EXISTS provas_alunos (
        prova_id TEXT,
        aluno_email TEXT,
        PRIMARY KEY(prova_id, aluno_email)
      );

      CREATE TABLE IF NOT EXISTS respostas (
        id TEXT PRIMARY KEY,
        prova_id TEXT,
        aluno_email TEXT,
        questao_id TEXT,
        resposta TEXT,
        data_submissao TEXT
      );

      CREATE TABLE IF NOT EXISTS links_unicos (
        prova_id TEXT,
        aluno_email TEXT,
        link_unico TEXT PRIMARY KEY,
        data_criacao TEXT,
        utilizado INTEGER DEFAULT 0,
        data_utilizacao TEXT
      );
    `, (err) => {
      if (err) {
        console.error('Erro ao criar tabelas:', err);
      } else {
        console.log('Tabelas verificadas/criadas com sucesso!');
        popularUsuarios();
      }
    });
  });
}

function popularUsuarios() {
  // Insere os usuários permitidos nas tabelas apropriadas
  const alunos = CREDENCIAIS.alunos;
  const professores = CREDENCIAIS.professores;
  
  // Cria uma tabela para usuários se não existir
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      email TEXT PRIMARY KEY,
      tipo TEXT,
      senha TEXT
    )
  `, () => {
    // Insere alunos
    alunos.forEach(email => {
      db.run(
        `INSERT OR IGNORE INTO usuarios (email, tipo, senha) VALUES (?, ?, ?)`,
        [email, 'aluno', CREDENCIAIS.senhaPadrao]
      );
    });
    
    // Insere professores
    professores.forEach(email => {
      db.run(
        `INSERT OR IGNORE INTO usuarios (email, tipo, senha) VALUES (?, ?, ?)`,
        [email, 'professor', CREDENCIAIS.senhaPadrao]
      );
    });
    
    console.log('Usuários importados das credenciais para o banco de dados');
  });
}

export default db;