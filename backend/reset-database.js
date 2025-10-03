// reset-database.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databasePath = path.join(__dirname, 'database', 'database.db');

try {
    if (fs.existsSync(databasePath)) {
        fs.unlinkSync(databasePath);
        console.log('✅ Banco de dados antigo removido!');
    } else {
        console.log('ℹ️  Nenhum banco de dados encontrado para remover.');
    }
    
    console.log('🔄 Reinicie o servidor para criar um novo banco com usuários corretos.');
    console.log('👤 Usuários que serão criados:');
    console.log('   - Professor: 12345678901 / senha123');
    console.log('   - Aluno: 10987654321 / senha123 / Turma 3A');
    console.log('   - Aluno: 51833319877 / Escolasesi123456 / Turma 9B');
    
} catch (error) {
    console.error('❌ Erro ao resetar banco:', error);
}