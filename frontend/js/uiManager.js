// Função para exibir as questões
function displayQuestions() {
    const questionsContainer = document.getElementById('questions-container');
    const examData = getExamData();
    
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