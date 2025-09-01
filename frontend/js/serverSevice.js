// Função para salvar a prova
function saveExam() {
    // Coletar dados da prova
    const examData = getExamData();
    examData.title = document.getElementById('exam-title').value.trim();
    examData.description = document.getElementById('exam-description').value.trim();
    examData.duration = parseInt(document.getElementById('exam-time').value);
    examData.date = document.getElementById('exam-date').value;
    
    // Validações
    if (!examData.title) {
        alert('Por favor, informe o título da prova.');
        return;
    }
    
    if (!examData.date) {
        alert('Por favor, selecione a data de aplicação da prova.');
        return;
    }
    
    if (examData.questions.length === 0) {
        alert('Por favor, adicione pelo menos uma questão à prova.');
        return;
    }
    
    // Enviar para o servidor
    sendExamToServer();
}

// Função para enviar a prova ao servidor
function sendExamToServer() {
    const examData = getExamData();
    
    // Simulação de envio para o servidor
    console.log('Dados da prova a serem enviados:', examData);
    
    // Aqui você faria a requisição AJAX para o servidor
    // Exemplo com fetch:
    /*
    fetch('/api/provas', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(examData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Prova salva com sucesso!');
            // Limpar formulário ou redirecionar
        } else {
            alert('Erro ao salvar prova: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Erro:', error);
        alert('Erro ao conectar com o servidor.');
    });
    */
    
    // Simulando sucesso para demonstração
    alert('Prova salva com sucesso! Em uma implementação real, os dados seriam enviados ao servidor.');
}