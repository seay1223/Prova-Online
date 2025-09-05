const CREDENCIAIS = {
    senhaPadrao: 'Escolasesi123456',
    
    alunos: [
        { cpf: '12345678900', nome: 'João Silva', turma: '9º Ano A' },
        { cpf: '98765432100', nome: 'Maria Santos', turma: '9º Ano B' }
    ],
    
    professores: [
        { cpf: '41389822800', nome: 'Professor Teste' },
        { cpf: '11122233344', nome: 'Outro Professor' }
    ]
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.CREDENCIAIS = CREDENCIAIS;
}