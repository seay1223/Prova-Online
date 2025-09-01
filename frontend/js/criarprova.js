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