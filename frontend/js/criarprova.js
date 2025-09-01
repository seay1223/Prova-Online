// criarprova.js
// Gerencia a criação de provas no sistema

import { saveExam, updateExam } from './serverService.js';
import { showNotification, clearNotifications } from './uiManager.js';
import { Question, QuestionType } from './questionManager.js';

class ExamCreator {
    constructor() {
        this.examData = {
            title: '',
            description: '',
            duration: 60,
            date: '',
            questions: []
        };
        
        this.currentQuestion = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setMinDate();
        this.loadDraft(); // Carregar rascunho salvo, se existir
    }

    setupEventListeners() {
        // Configurações da prova
        document.getElementById('exam-title').addEventListener('input', (e) => {
            this.examData.title = e.target.value;
            this.saveDraft();
        });

        document.getElementById('exam-description').addEventListener('input', (e) => {
            this.examData.description = e.target.value;
            this.saveDraft();
        });

        document.getElementById('exam-time').addEventListener('input', (e) => {
            this.examData.duration = parseInt(e.target.value) || 60;
            this.saveDraft();
        });

        document.getElementById('exam-date').addEventListener('change', (e) => {
            this.examData.date = e.target.value;
            this.saveDraft();
        });

        // Gerenciamento de questões
        document.getElementById('add-question').addEventListener('click', () => {
            this.addQuestion();
        });

        document.getElementById('question-type').addEventListener('change', (e) => {
            this.toggleAlternatives(e.target.value);
        });

        document.getElementById('save-exam').addEventListener('click', () => {
            this.saveExam();
        });

        // Botão para adicionar alternativa
        document.getElementById('add-alternative').addEventListener('click', () => {
            this.addAlternative();
        });

        // Delegation para botões de remover alternativa
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-alternative')) {
                this.removeAlternative(e.target);
            }
        });
    }

    setMinDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('exam-date').setAttribute('min', today);
    }

    toggleAlternatives(type) {
        const alternativesContainer = document.getElementById('alternatives-container');
        
        if (type === 'multiple' || type === 'truefalse') {
            alternativesContainer.style.display = 'block';
            
            if (type === 'truefalse') {
                this.setupTrueFalseAlternatives();
            } else {
                this.setupMultipleChoiceAlternatives();
            }
        } else {
            alternativesContainer.style.display = 'none';
        }
    }

    setupTrueFalseAlternatives() {
        const container = document.getElementById('alternatives-container');
        container.innerHTML = `
            <div class="alternative-item">
                <input type="radio" name="correct-answer" value="0" required>
                <input type="text" value="Verdadeiro" readonly>
                <button class="btn-danger remove-alternative" disabled>X</button>
            </div>
            <div class="alternative-item">
                <input type="radio" name="correct-answer" value="1" required>
                <input type="text" value="Falso" readonly>
                <button class="btn-danger remove-alternative" disabled>X</button>
            </div>
        `;
    }

    setupMultipleChoiceAlternatives() {
        const container = document.getElementById('alternatives-container');
        container.innerHTML = `
            <div class="alternative-item">
                <input type="radio" name="correct-answer" value="0" required>
                <input type="text" placeholder="Alternativa A" required>
                <button class="btn-danger remove-alternative">X</button>
            </div>
            <div class="alternative-item">
                <input type="radio" name="correct-answer" value="1" required>
                <input type="text" placeholder="Alternativa B" required>
                <button class="btn-danger remove-alternative">X</button>
            </div>
            <button type="button" class="btn-secondary" id="add-alternative-btn">+ Adicionar Alternativa</button>
        `;

        document.getElementById('add-alternative-btn').addEventListener('click', () => {
            this.addAlternative();
        });
    }

    addAlternative() {
        const container = document.getElementById('alternatives-container');
        const alternativeCount = document.querySelectorAll('.alternative-item').length;
        const letter = String.fromCharCode(65 + alternativeCount);
        
        const newAlternative = document.createElement('div');
        newAlternative.className = 'alternative-item';
        newAlternative.innerHTML = `
            <input type="radio" name="correct-answer" value="${alternativeCount}">
            <input type="text" placeholder="Alternativa ${letter}" required>
            <button class="btn-danger remove-alternative">X</button>
        `;
        
        // Inserir antes do botão de adicionar
        const addButton = document.getElementById('add-alternative-btn');
        container.insertBefore(newAlternative, addButton);
    }

    removeAlternative(button) {
        const alternatives = document.querySelectorAll('.alternative-item');
        if (alternatives.length > 2) {
            button.closest('.alternative-item').remove();
            this.renumberAlternatives();
        } else {
            showNotification('A questão deve ter pelo menos 2 alternativas.', 'error');
        }
    }

    renumberAlternatives() {
        document.querySelectorAll('.alternative-item').forEach((item, index) => {
            const input = item.querySelector('input[type="text"]');
            const letter = String.fromCharCode(65 + index);
            input.placeholder = `Alternativa ${letter}`;
            
            const radio = item.querySelector('input[type="radio"]');
            radio.value = index;
        });
    }

    addQuestion() {
        clearNotifications();
        
        const questionText = document.getElementById('question-text').value.trim();
        const questionType = document.getElementById('question-type').value;
        
        if (!questionText) {
            showNotification('Por favor, digite o enunciado da questão.', 'error');
            return;
        }
        
        let alternatives = [];
        let correctAnswer = null;
        
        if (questionType === 'multiple' || questionType === 'truefalse') {
            const alternativeItems = document.querySelectorAll('.alternative-item');
            
            alternativeItems.forEach((item, index) => {
                const textInput = item.querySelector('input[type="text"]');
                const radioInput = item.querySelector('input[type="radio"]');
                
                if (textInput.value.trim()) {
                    alternatives.push({
                        text: textInput.value.trim(),
                        correct: radioInput.checked
                    });
                    
                    if (radioInput.checked) {
                        correctAnswer = index;
                    }
                }
            });
            
            if (alternatives.length < 2) {
                showNotification('A questão deve ter pelo menos 2 alternativas.', 'error');
                return;
            }
            
            if (correctAnswer === null) {
                showNotification('Por favor, selecione a alternativa correta.', 'error');
                return;
            }
        }
        
        const question = new Question({
            text: questionText,
            type: questionType,
            alternatives: alternatives,
            correctAnswer: correctAnswer
        });
        
        this.examData.questions.push(question);
        this.displayQuestions();
        this.clearQuestionForm();
        this.saveDraft();
        
        showNotification('Questão adicionada com sucesso!', 'success');
    }

    displayQuestions() {
        const container = document.getElementById('questions-container');
        container.innerHTML = '';
        
        if (this.examData.questions.length === 0) {
            container.innerHTML = '<p class="no-questions">Nenhuma questão adicionada ainda.</p>';
            return;
        }
        
        this.examData.questions.forEach((question, index) => {
            const questionEl = document.createElement('div');
            questionEl.className = 'question-item';
            questionEl.innerHTML = this.createQuestionHTML(question, index);
            container.appendChild(questionEl);
            
            // Adicionar event listeners para os botões
            questionEl.querySelector('.edit-question').addEventListener('click', () => {
                this.editQuestion(index);
            });
            
            questionEl.querySelector('.delete-question').addEventListener('click', () => {
                this.deleteQuestion(index);
            });
        });
    }

    createQuestionHTML(question, index) {
        let alternativesHTML = '';
        
        if (question.type === 'multiple' || question.type === 'truefalse') {
            alternativesHTML = '<div class="alternatives-list">';
            question.alternatives.forEach((alt, altIndex) => {
                alternativesHTML += `
                    <div class="alternative-display ${alt.correct ? 'correct' : ''}">
                        ${String.fromCharCode(65 + altIndex)}. ${alt.text}
                        ${alt.correct ? ' ✓' : ''}
                    </div>
                `;
            });
            alternativesHTML += '</div>';
        }
        
        return `
            <div class="question-header">
                <h4>Questão ${index + 1}</h4>
                <div class="question-actions">
                    <button class="btn-secondary edit-question">Editar</button>
                    <button class="btn-danger delete-question">Excluir</button>
                </div>
            </div>
            <p class="question-text">${question.text}</p>
            ${alternativesHTML}
        `;
    }

    editQuestion(index) {
        const question = this.examData.questions[index];
        document.getElementById('question-text').value = question.text;
        document.getElementById('question-type').value = question.type;
        
        this.toggleAlternatives(question.type);
        
        if (question.type === 'multiple' || question.type === 'truefalse') {
            this.populateAlternatives(question.alternatives, question.correctAnswer);
        }
        
        // Remover a questão para readicionar após edição
        this.examData.questions.splice(index, 1);
        this.displayQuestions();
    }

    populateAlternatives(alternatives, correctIndex) {
        const container = document.getElementById('alternatives-container');
        container.innerHTML = '';
        
        alternatives.forEach((alt, index) => {
            const letter = String.fromCharCode(65 + index);
            const alternativeEl = document.createElement('div');
            alternativeEl.className = 'alternative-item';
            alternativeEl.innerHTML = `
                <input type="radio" name="correct-answer" value="${index}" ${index === correctIndex ? 'checked' : ''}>
                <input type="text" value="${alt.text}" placeholder="Alternativa ${letter}" required>
                <button class="btn-danger remove-alternative">X</button>
            `;
            container.appendChild(alternativeEl);
        });
        
        // Adicionar botão para novas alternativas
        const addButton = document.createElement('button');
        addButton.type = 'button';
        addButton.className = 'btn-secondary';
        addButton.id = 'add-alternative-btn';
        addButton.textContent = '+ Adicionar Alternativa';
        addButton.addEventListener('click', () => this.addAlternative());
        container.appendChild(addButton);
    }

    deleteQuestion(index) {
        if (confirm('Tem certeza que deseja excluir esta questão?')) {
            this.examData.questions.splice(index, 1);
            this.displayQuestions();
            this.saveDraft();
            showNotification('Questão excluída com sucesso.', 'success');
        }
    }

    clearQuestionForm() {
        document.getElementById('question-text').value = '';
        document.getElementById('question-type').value = 'multiple';
        this.toggleAlternatives('multiple');
    }

    async saveExam() {
        clearNotifications();
        
        // Validar dados básicos
        this.examData.title = document.getElementById('exam-title').value.trim();
        this.examData.description = document.getElementById('exam-description').value.trim();
        this.examData.duration = parseInt(document.getElementById('exam-time').value) || 60;
        this.examData.date = document.getElementById('exam-date').value;
        
        if (!this.examData.title) {
            showNotification('Por favor, informe o título da prova.', 'error');
            return;
        }
        
        if (!this.examData.date) {
            showNotification('Por favor, selecione a data de aplicação.', 'error');
            return;
        }
        
        if (this.examData.questions.length === 0) {
            showNotification('Por favor, adicione pelo menos uma questão.', 'error');
            return;
        }
        
        try {
            showNotification('Salvando prova...', 'info');
            
            const result = await saveExam(this.examData);
            
            if (result.success) {
                showNotification('Prova salva com sucesso!', 'success');
                this.clearDraft();
                this.examData.questions = [];
                this.displayQuestions();
                
                // Limpar formulário principal
                document.getElementById('exam-title').value = '';
                document.getElementById('exam-description').value = '';
                document.getElementById('exam-time').value = '60';
                document.getElementById('exam-date').value = '';
            } else {
                showNotification('Erro ao salvar prova: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar prova:', error);
            showNotification('Erro ao conectar com o servidor.', 'error');
        }
    }

    saveDraft() {
        localStorage.setItem('examDraft', JSON.stringify(this.examData));
    }

    loadDraft() {
        const draft = localStorage.getItem('examDraft');
        if (draft) {
            try {
                this.examData = JSON.parse(draft);
                
                // Preencher campos do formulário
                document.getElementById('exam-title').value = this.examData.title;
                document.getElementById('exam-description').value = this.examData.description;
                document.getElementById('exam-time').value = this.examData.duration;
                document.getElementById('exam-date').value = this.examData.date;
                
                this.displayQuestions();
            } catch (error) {
                console.error('Erro ao carregar rascunho:', error);
            }
        }
    }

    clearDraft() {
        localStorage.removeItem('examDraft');
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.examCreator = new ExamCreator();
});

export default ExamCreator;