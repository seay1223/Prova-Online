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
        const { alternatives: altArray, correctAnswer: correct } = getAlternativesFromForm();
        alternatives = altArray;
        correctAnswer = correct;
        
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
    const examData = getExamData();
    examData.questions.push(question);
    updateExamData(examData);
    
    // Atualizar a exibição
    displayQuestions();
    
    // Limpar o formulário
    document.getElementById('question-text').value = '';
    document.getElementById('question-type').value = 'multiple';
    
    // Resetar alternativas
    resetAlternatives();
    toggleAlternatives();
}

// Função para excluir questão
function deleteQuestion(questionId) {
    if (confirm('Tem certeza que deseja excluir esta questão?')) {
        const examData = getExamData();
        examData.questions = examData.questions.filter(q => q.id !== questionId);
        updateExamData(examData);
        displayQuestions();
    }
}

// Função para editar questão
function editQuestion(questionId) {
    // Encontrar a questão a ser editada
    const examData = getExamData();
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
    updateExamData(examData);
    displayQuestions();
    
    // Rolar para o topo do formulário
    document.getElementById('question-text').focus();
}