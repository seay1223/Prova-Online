import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function initialize() {
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
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
  `);

  return db;
}

export default initialize();
