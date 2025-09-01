// questionManager.js - Gerenciamento de questões

export class Question {
    constructor(data = {}) {
        this.id = data.id || Date.now() + Math.random().toString(36).substr(2, 9);
        this.text = data.text || '';
        this.type = data.type || 'multiple';
        this.alternatives = data.alternatives || [];
        this.correctAnswer = data.correctAnswer !== undefined ? data.correctAnswer : null;
        this.points = data.points || 1;
        this.category = data.category || '';
        this.difficulty = data.difficulty || 'medium';
    }

    validate() {
        const errors = [];

        if (!this.text.trim()) {
            errors.push('O enunciado da questão é obrigatório');
        }

        if (this.type === 'multiple' || this.type === 'truefalse') {
            if (this.alternatives.length < 2) {
                errors.push('A questão deve ter pelo menos 2 alternativas');
            }

            const hasCorrect = this.alternatives.some(alt => alt.correct);
            if (!hasCorrect) {
                errors.push('Selecione a alternativa correta');
            }

            const emptyAlts = this.alternatives.filter(alt => !alt.text.trim());
            if (emptyAlts.length > 0) {
                errors.push('Todas as alternativas devem ter texto');
            }
        }

        if (this.points <= 0) {
            errors.push('A pontuação deve ser maior que zero');
        }

        return errors;
    }

    addAlternative(text = '', correct = false) {
        this.alternatives.push({
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            text: text,
            correct: correct
        });
    }

    removeAlternative(altId) {
        this.alternatives = this.alternatives.filter(alt => alt.id !== altId);
    }

    toJSON() {
        return {
            id: this.id,
            text: this.text,
            type: this.type,
            alternatives: this.alternatives,
            correctAnswer: this.correctAnswer,
            points: this.points,
            category: this.category,
            difficulty: this.difficulty
        };
    }

    static fromJSON(json) {
        return new Question(json);
    }
}

export class QuestionManager {
    constructor() {
        this.questions = [];
        this.categories = ['Matemática', 'Português', 'História', 'Geografia', 'Ciências', 'Inglês'];
        this.difficulties = ['fácil', 'médio', 'difícil'];
    }

    addQuestion(questionData) {
        const question = new Question(questionData);
        const errors = question.validate();
        
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        this.questions.push(question);
        return question;
    }

    getQuestion(id) {
        return this.questions.find(q => q.id === id);
    }

    updateQuestion(id, updates) {
        const index = this.questions.findIndex(q => q.id === id);
        if (index === -1) return null;

        const updatedQuestion = { ...this.questions[index], ...updates };
        const errors = new Question(updatedQuestion).validate();
        
        if (errors.length > 0) {
            throw new Error(errors.join(', '));
        }

        this.questions[index] = updatedQuestion;
        return updatedQuestion;
    }

    deleteQuestion(id) {
        const index = this.questions.findIndex(q => q.id === id);
        if (index === -1) return false;

        this.questions.splice(index, 1);
        return true;
    }

    filterQuestions(filters = {}) {
        return this.questions.filter(question => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                
                switch (key) {
                    case 'category':
                        return question.category === value;
                    case 'difficulty':
                        return question.difficulty === value;
                    case 'type':
                        return question.type === value;
                    case 'search':
                        return question.text.toLowerCase().includes(value.toLowerCase());
                    default:
                        return true;
                }
            });
        });
    }

    getTotalPoints() {
        return this.questions.reduce((total, question) => total + question.points, 0);
    }

    exportToJSON() {
        return JSON.stringify(this.questions.map(q => q.toJSON()), null, 2);
    }

    importFromJSON(json) {
        try {
            const data = JSON.parse(json);
            if (!Array.isArray(data)) {
                throw new Error('Formato inválido');
            }

            this.questions = data.map(item => Question.fromJSON(item));
            return true;
        } catch (error) {
            console.error('Erro ao importar questões:', error);
            return false;
        }
    }

    shuffleQuestions() {
        for (let i = this.questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.questions[i], this.questions[j]] = [this.questions[j], this.questions[i]];
        }
    }

    shuffleAlternatives() {
        this.questions.forEach(question => {
            if (question.type === 'multiple') {
                // Salvar a alternativa correta
                const correctIndex = question.alternatives.findIndex(alt => alt.correct);
                
                // Embaralhar alternativas
                for (let i = question.alternatives.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [question.alternatives[i], question.alternatives[j]] = 
                    [question.alternatives[j], question.alternatives[i]];
                }
                
                // Atualizar índice da alternativa correta
                question.correctAnswer = question.alternatives.findIndex(alt => alt.correct);
            }
        });
    }
}

export const QuestionType = {
    MULTIPLE: 'multiple',
    TRUEFALSE: 'truefalse',
    ESSAY: 'essay',
    SHORT_ANSWER: 'short_answer'
};

// Instância global
export const questionManager = new QuestionManager();