// Variáveis globais
let examData = {
    title: '',
    description: '',
    duration: 60,
    date: '',
    questions: []
};

let alternativeCount = 2; // Inicia com 2 alternativas

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Configurar data mínima para hoje
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('exam-date').setAttribute('min', today);
    
    // Adicionar event listeners
    document.getElementById('add-alternative').addEventListener('click', addAlternative);
    document.getElementById('add-question').addEventListener('click', addQuestion);
    document.getElementById('save-exam').addEventListener('click', saveExam);
    document.getElementById('question-type').addEventListener('change', toggleAlternatives);
    
    // Adicionar listeners para remover alternativas
    document.querySelectorAll('.remove-alternative').forEach(button => {
        button.addEventListener('click', function() {
            if (document.querySelectorAll('.alternative-item').length > 2) {
                this.parentElement.remove();
            } else {
                alert('A questão deve ter pelo menos 2 alternativas.');
            }
        });
    });
    
    // Inicializar a visibilidade das alternativas
    toggleAlternatives();
});

// Função para adicionar alternativa
function addAlternative() {
    const alternativesContainer = document.getElementById('alternatives-container');
    const newAlternative = document.createElement('div');
    newAlternative.className = 'alternative-item';
    
    const letter = String.fromCharCode(65 + alternativeCount); // A, B, C, etc.
    
    newAlternative.innerHTML = `
        <input type="radio" name="correct-answer" value="${alternativeCount}">
        <input type="text" placeholder="Alternativa ${letter}">
        <button class="btn-danger remove-alternative">X</button>
    `;
    
    alternativesContainer.insertBefore(newAlternative, document.getElementById('add-alternative'));
    
    // Adicionar listener para o botão de remover
    newAlternative.querySelector('.remove-alternative').addEventListener('click', function() {
        if (document.querySelectorAll('.alternative-item').length > 2) {
            this.parentElement.remove();
        } else {
            alert('A questão deve ter pelo menos 2 alternativas.');
        }
    });
    
    alternativeCount++;
}

// Função para alternar a visibilidade das alternativas
function toggleAlternatives() {
    const questionType = document.getElementById('question-type').value;
    const alternativesContainer = document.getElementById('alternatives-container');
    
    if (questionType === 'multiple' || questionType === 'truefalse') {
        alternativesContainer.style.display = 'block';
        
        // Se for verdadeiro/falso, criar opções específicas
        if (questionType === 'truefalse') {
            alternativesContainer.innerHTML = `
                <h4>Alternativas</h4>
                <div class="alternative-item">
                    <input type="radio" name="correct-answer" value="0">
                    <input type="text" value="Verdadeiro" readonly>
                    <button class="btn-danger remove-alternative" disabled>X</button>
                </div>
                <div class="alternative-item">
                    <input type="radio" name="correct-answer" value="1">
                    <input type="text" value="Falso" readonly>
                    <button class="btn-danger remove-alternative" disabled>X</button>
                </div>
            `;
            // Re-adicionar o botão de adicionar alternativa
            const addButton = document.createElement('button');
            addButton.className = 'btn-secondary';
            addButton.id = 'add-alternative';
            addButton.textContent = '+ Adicionar Alternativa';
            addButton.addEventListener('click', addAlternative);
            alternativesContainer.appendChild(addButton);
        }
    } else {
        alternativesContainer.style.display = 'none';
    }
}

// Função para adicionar questão
function addQuestion() {
    const questionText = document.getElementById('question-text').value.trim();
    const questionType = document.getElementById('question-type').value;
    
    if (!questionText) {
        alert('Por favor, digite o enunciado da questão.');
        return;
    }
    
    let alternatives = [];
    let correctAnswer = -1;
    
    // Coletar alternativas para questões de múltipla escolha
    if (questionType === 'multiple' || questionType === 'truefalse') {
        const alternativeItems = document.querySelectorAll('.alternative-item');
        
        alternativeItems.forEach((item, index) => {
            const textInput = item.querySelector('input[type="text"]');
            const radioInput = item.querySelector('input[type="radio"]');
            
            if (textInput.value.trim()) {
                alternatives.push(textInput.value.trim());
                
                if (radioInput.checked) {
                    correctAnswer = index;
                }
            }
        });
        
        if (alternatives.length < 2) {
            alert('A questão deve ter pelo menos 2 alternativas.');
            return;
        }
        
        if (correctAnswer === -1) {
            alert('Por favor, selecione a alternativa correta.');
            return;
        }
    }
    
    // Criar objeto da questão
    const question = {
        id: Date.now(), // ID único baseado no timestamp
        text: questionText,
        type: questionType,
        alternatives: alternatives,
        correctAnswer: correctAnswer
    };
    
    // Adicionar à lista de questões
    examData.questions.push(question);
    
    // Atualizar a exibição
    displayQuestions();
    
    // Limpar o formulário
    document.getElementById('question-text').value = '';
    document.getElementById('question-type').value = 'multiple';
    
    // Resetar alternativas
    resetAlternatives();
    toggleAlternatives();
}

// Função para resetar as alternativas
function resetAlternatives() {
    alternativeCount = 2;
    const alternativesContainer = document.getElementById('alternatives-container');
    alternativesContainer.innerHTML = `
        <h4>Alternativas</h4>
        <div class="alternative-item">
            <input type="radio" name="correct-answer" value="0">
            <input type="text" placeholder="Alternativa A">
            <button class="btn-danger remove-alternative">X</button>
        </div>
        <div class="alternative-item">
            <input type="radio" name="correct-answer" value="1">
            <input type="text" placeholder="Alternativa B">
            <button class="btn-danger remove-alternative">X</button>
        </div>
        <button class="btn-secondary" id="add-alternative">+ Adicionar Alternativa</button>
    `;
    
    // Re-adicionar event listeners
    document.getElementById('add-alternative').addEventListener('click', addAlternative);
    document.querySelectorAll('.remove-alternative').forEach(button => {
        button.addEventListener('click', function() {
            if (document.querySelectorAll('.alternative-item').length > 2) {
                this.parentElement.remove();
            } else {
                alert('A questão deve ter pelo menos 2 alternativas.');
            }
        });
    });
}

// Função para exibir as questões
function displayQuestions() {
    const questionsContainer = document.getElementById('questions-container');
    questionsContainer.innerHTML = '';
    
    if (examData.questions.length === 0) {
        questionsContainer.innerHTML = '<p class="no-questions">Nenhuma questão adicionada ainda.</p>';
        return;
    }
    
    examData.questions.forEach((question, index) => {
        const questionElement = document.createElement('div');
        questionElement.className = 'question-item';
        questionElement.dataset.id = question.id;
        
        let alternativesHTML = '';
        if (question.type === 'multiple' || question.type === 'truefalse') {
            alternativesHTML = '<div class="alternatives">';
            question.alternatives.forEach((alt, altIndex) => {
                const isCorrect = altIndex === question.correctAnswer;
                alternativesHTML += `
                    <div>${alt} ${isCorrect ? '<span class="correct">(Correta)</span>' : ''}</div>
                `;
            });
            alternativesHTML += '</div>';
        } else {
            alternativesHTML = '<div class="alternatives"><em>Resposta aberta</em></div>';
        }
        
        questionElement.innerHTML = `
            <h4>Questão ${index + 1}</h4>
            <p>${question.text}</p>
            ${alternativesHTML}
            <div class="question-actions">
                <button class="btn-secondary edit-question">Editar</button>
                <button class="btn-danger delete-question">Excluir</button>
            </div>
        `;
        
        questionsContainer.appendChild(questionElement);
        
        // Adicionar event listeners para os botões
        questionElement.querySelector('.delete-question').addEventListener('click', function() {
            deleteQuestion(question.id);
        });
        
        questionElement.querySelector('.edit-question').addEventListener('click', function() {
            editQuestion(question.id);
        });
    });
}

// Função para excluir questão
function deleteQuestion(questionId) {
    if (confirm('Tem certeza que deseja excluir esta questão?')) {
        examData.questions = examData.questions.filter(q => q.id !== questionId);
        displayQuestions();
    }
}

// Função para editar questão
function editQuestion(questionId) {
    // Encontrar a questão a ser editada
    const questionIndex = examData.questions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) return;
    
    const question = examData.questions[questionIndex];
    
    // Preencher o formulário com os dados da questão
    document.getElementById('question-text').value = question.text;
    document.getElementById('question-type').value = question.type;
    
    // Configurar alternativas se aplicável
    if (question.type === 'multiple' || question.type === 'truefalse') {
        resetAlternatives();
        
        // Adicionar alternativas
        question.alternatives.forEach((alt, index) => {
            if (index >= 2) {
                addAlternative();
            }
            
            const alternativeItems = document.querySelectorAll('.alternative-item');
            if (alternativeItems[index]) {
                const textInput = alternativeItems[index].querySelector('input[type="text"]');
                const radioInput = alternativeItems[index].querySelector('input[type="radio"]');
                
                textInput.value = alt;
                if (index === question.correctAnswer) {
                    radioInput.checked = true;
                }
            }
        });
    }
    
    toggleAlternatives();
    
    // Remover a questão da lista (será readicionada ao salvar)
    examData.questions.splice(questionIndex, 1);
    displayQuestions();
    
    // Rolar para o topo do formulário
    document.getElementById('question-text').focus();
}

// Função para salvar a prova
function saveExam() {
    // Coletar dados da prova
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
// Substitua a função sendExamToServer() por esta versão corrigida:

// Função para enviar a prova ao servidor
function sendExamToServer() {
    // Mostrar indicador de carregamento
    const saveButton = document.getElementById('save-exam');
    const originalText = saveButton.textContent;
    saveButton.textContent = 'Salvando...';
    saveButton.disabled = true;
    
    // Validar dados antes de enviar
    if (!examData.title || !examData.date || examData.questions.length === 0) {
        alert('Dados da prova incompletos');
        saveButton.textContent = originalText;
        saveButton.disabled = false;
        return;
    }
    
    // Validar cada questão
    for (let i = 0; i < examData.questions.length; i++) {
        const question = examData.questions[i];
        
        if (!question.text.trim()) {
            alert(`Questão ${i + 1} está sem enunciado`);
            saveButton.textContent = originalText;
            saveButton.disabled = false;
            return;
        }
        
        if ((question.type === 'multiple' || question.type === 'truefalse') && 
            (!question.alternatives || question.alternatives.length < 2)) {
            alert(`Questão ${i + 1} precisa de pelo menos 2 alternativas`);
            saveButton.textContent = originalText;
            saveButton.disabled = false;
            return;
        }
        
        if ((question.type === 'multiple' || question.type === 'truefalse') && 
            (question.correctAnswer === undefined || question.correctAnswer === -1)) {
            alert(`Questão ${i + 1} precisa de uma alternativa correta selecionada`);
            saveButton.textContent = originalText;
            saveButton.disabled = false;
            return;
        }
    }
    
    // Verificar se a rota da API existe
    const apiUrl = '/api/exams';
    
    // Enviar dados para o servidor
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            title: examData.title,
            description: examData.description,
            duration: parseInt(examData.duration),
            date: examData.date,
            questions: examData.questions.map(q => ({
                text: q.text,
                type: q.type,
                alternatives: q.alternatives,
                correctAnswer: parseInt(q.correctAnswer)
            }))
        })
    })
    .then(response => {
        if (!response.ok) {
            // Se for erro 404, a rota não existe
            if (response.status === 404) {
                throw new Error(`Rota da API não encontrada (404). Verifique se o endpoint ${apiUrl} está correto.`);
            }
            return response.json().then(err => {
                throw new Error(err.message || `Erro HTTP: ${response.status}`);
            }).catch(() => {
                throw new Error(`Erro HTTP: ${response.status}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            alert('Prova salva com sucesso! ID: ' + (data.examId || data.id));
            resetExamForm();
        } else {
            throw new Error(data.message || 'Erro ao salvar prova');
        }
    })
    .catch(error => {
        console.error('Erro detalhado:', error);
        handleApiError(error);
    })
    .finally(() => {
        saveButton.textContent = originalText;
        saveButton.disabled = false;
    });
}

// Função para melhorar o tratamento de erros
function handleApiError(error) {
    console.error('Erro na API:', error);
    
    let errorMessage = 'Erro ao salvar prova: ';
    
    if (error.message.includes('Failed to fetch')) {
        errorMessage += 'Erro de conexão. Verifique sua internet e tente novamente.';
    } else if (error.message.includes('404')) {
        errorMessage += 'Rota da API não encontrada. ';
        errorMessage += 'Verifique se o servidor está rodando e se a rota /api/exams está configurada.';
    } else if (error.message.includes('401') || error.message.includes('403')) {
        errorMessage += 'Sessão expirada. Faça login novamente.';
    } else if (error.message.includes('500')) {
        errorMessage += 'Erro interno do servidor. Tente novamente mais tarde.';
    } else {
        errorMessage += error.message || 'Erro desconhecido ao salvar a prova';
    }
    
    alert(errorMessage);
}

// Função alternativa para simular salvamento (para desenvolvimento)
function simulateSaveExam() {
    // Mostrar indicador de carregamento
    const saveButton = document.getElementById('save-exam');
    const originalText = saveButton.textContent;
    saveButton.textContent = 'Salvando...';
    saveButton.disabled = true;
    
    // Simular tempo de processamento
    setTimeout(() => {
        // Gerar ID simulado
        const examId = 'EXAM-' + Date.now();
        
        // Mostrar dados no console para debug
        console.log('Dados da prova a serem salvos:', examData);
        
        alert(`Prova "${examData.title}" salva com sucesso! (ID simulado: ${examId})\n\nEsta é uma simulação - no ambiente real os dados seriam enviados para o servidor.`);
        
        // Resetar formulário
        resetExamForm();
        
        saveButton.textContent = originalText;
        saveButton.disabled = false;
    }, 1500);
}

// Modifique o event listener do botão salvar para usar a versão alternativa se necessário:
document.addEventListener('DOMContentLoaded', function() {
    // ... código anterior ...
    
    // Verificar se estamos em ambiente de desenvolvimento
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname === '';
    
    // Usar simulação em desenvolvimento se a API não estiver disponível
    document.getElementById('save-exam').addEventListener('click', function() {
        if (isDevelopment) {
            // Perguntar ao usuário qual método usar
            if (confirm('Modo desenvolvimento: Deseja simular o salvamento? (Cancelar para tentar API real)')) {
                simulateSaveExam();
            } else {
                saveExam();
            }
        } else {
            saveExam();
        }
    });
});