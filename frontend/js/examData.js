// Variáveis globais para armazenar os dados da prova
let examData = {
    title: '',
    description: '',
    duration: 60,
    date: '',
    questions: []
};

// Função para obter os dados da prova
function getExamData() {
    return examData;
}

// Função para atualizar os dados da prova
function updateExamData(newData) {
    examData = { ...examData, ...newData };
}

// Função para limpar os dados da prova
function clearExamData() {
    examData = {
        title: '',
        description: '',
        duration: 60,
        date: '',
        questions: []
    };
}