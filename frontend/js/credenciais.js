// frontend/js/credenciais.js

// Estrutura base de credenciais
const CREDENCIAIS_BASE = {
    alunos: [
        { cpf: '12345678901', turma: '9A', nome: 'Aluno 1' },
        { cpf: '23456789012', turma: '9B', nome: 'Aluno 2' },
        { cpf: '34567890123', turma: '8A', nome: 'Aluno 3' },
        { cpf: '51833319877', nome: 'Samuel Reis', turma: '9B' }
    ],
    professores: [
        '98765432100' // APENAS CPF como string (formato simples)
    ],
    senhaPadrao: 'Escolasesi123456',
    turmas: ["9B", "9A", "8B", "8A", "7A", "7B", "6A", "6B"]
};

// Carregar professores do localStorage se existirem
let professoresSalvos = [];
try {
    const savedProfessores = localStorage.getItem('credenciaisProfessores');
    if (savedProfessores) {
        professoresSalvos = JSON.parse(savedProfessores);
    }
} catch (e) {
    console.error('Erro ao carregar professores do localStorage:', e);
}

// Se houver professores salvos, substituir o array base
if (professoresSalvos.length > 0) {
    CREDENCIAIS_BASE.professores = professoresSalvos;
}

const CREDENCIAIS = {
    ...CREDENCIAIS_BASE,
    
    // Método para adicionar um professor
    adicionarProfessor: function(cpf) {
        if (!this.professores.includes(cpf)) {
            this.professores.push(cpf);
            // Salva no localStorage
            try {
                localStorage.setItem('credenciaisProfessores', JSON.stringify(this.professores));
                return true;
            } catch (e) {
                console.error('Erro ao salvar professores no localStorage:', e);
                return false;
            }
        }
        return false;
    }
};

// Tornar CREDENCIAIS disponível globalmente
window.CREDENCIAIS = CREDENCIAIS;

// Log para depuração
console.log('CREDENCIAIS carregado:', CREDENCIAIS);''