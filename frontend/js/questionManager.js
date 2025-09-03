// questionManager.js - Gerenciamento de questões (CORRIGIDO)
export class Question {
    constructor(data = {}) {
        this.id = data.id || this.generateId();
        this.text = data.text || '';
        this.type = data.type || 'multiple';
        this.alternatives = this.normalizeAlternatives(data.alternatives || []);
        this.correctAnswer = data.correctAnswer !== undefined ? data.correctAnswer : null;
        this.points = Math.max(1, parseInt(data.points) || 1);
        this.category = data.category || '';
        this.difficulty = data.difficulty || 'medium';
        this.explanation = data.explanation || '';
    }

    generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    normalizeAlternatives(alternatives) {
        return alternatives.map(alt => ({
            id: alt.id || this.generateId(),
            text: alt.text || '',
            correct: Boolean(alt.correct)
        }));
    }

    validate() {
        const errors = [];

        // Validar texto da questão
        if (!this.text.trim()) {
            errors.push('O enunciado da questão é obrigatório');
        }

        if (this.text.length > 1000) {
            errors.push('O enunciado não pode ter mais de 1000 caracteres');
        }

        // Validar alternativas para questões de múltipla escolha
        if (this.type === 'multiple' || this.type === 'truefalse') {
            if (this.alternatives.length < 2) {
                errors.push('A questão deve ter pelo menos 2 alternativas');
            }

            if (this.alternatives.length > 10) {
                errors.push('A questão não pode ter mais de 10 alternativas');
            }

            const hasCorrect = this.alternatives.some(alt => alt.correct);
            if (!hasCorrect) {
                errors.push('Selecione a alternativa correta');
            }

            const emptyAlts = this.alternatives.filter(alt => !alt.text.trim());
            if (emptyAlts.length > 0) {
                errors.push('Todas as alternativas devem ter texto');
            }

            const duplicateTexts = this.alternatives.some((alt, index) => 
                this.alternatives.some((a, i) => 
                    i !== index && 
                    a.text.trim().toLowerCase() === alt.text.trim().toLowerCase()
                )
            );
            if (duplicateTexts) {
                errors.push('Existem alternativas com texto duplicado');
            }
        }

        // Validar pontuação
        if (this.points <= 0) {
            errors.push('A pontuação deve ser maior que zero');
        }

        if (this.points > 10) {
            errors.push('A pontuação máxima por questão é 10');
        }

        // Validar tipo de questão
        if (!Object.values(QuestionType).includes(this.type)) {
            errors.push('Tipo de questão inválido');
        }

        return errors;
    }

    addAlternative(text = '', correct = false) {
        const newAlternative = {
            id: this.generateId(),
            text: text.trim(),
            correct: Boolean(correct)
        };
        
        this.alternatives.push(newAlternative);
        return newAlternative;
    }

    removeAlternative(altId) {
        const index = this.alternatives.findIndex(alt => alt.id === altId);
        if (index !== -1) {
            this.alternatives.splice(index, 1);
            
            // Se a alternativa removida era a correta, atualizar correctAnswer
            if (this.correctAnswer === index) {
                this.correctAnswer = null;
            } else if (this.correctAnswer > index) {
                this.correctAnswer--;
            }
            
            return true;
        }
        return false;
    }

    setCorrectAlternative(altId) {
        const index = this.alternatives.findIndex(alt => alt.id === altId);
        if (index !== -1) {
            // Marcar todas como incorretas primeiro
            this.alternatives.forEach(alt => alt.correct = false);
            
            // Marcar a selecionada como correta
            this.alternatives[index].correct = true;
            this.correctAnswer = index;
            return true;
        }
        return false;
    }

    getCorrectAlternative() {
        if (this.correctAnswer !== null && this.alternatives[this.correctAnswer]) {
            return this.alternatives[this.correctAnswer];
        }
        return this.alternatives.find(alt => alt.correct) || null;
    }

    shuffleAlternatives() {
        if (this.type !== 'multiple' && this.type !== 'truefalse') {
            return null;
        }

        // Salvar qual é a correta
        const correctAlt = this.getCorrectAlternative();
        
        // Embaralhar array
        for (let i = this.alternatives.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.alternatives[i], this.alternatives[j]] = [this.alternatives[j], this.alternatives[i]];
        }
        
        // Encontrar o novo índice da correta
        if (correctAlt) {
            const newIndex = this.alternatives.findIndex(alt => alt.id === correctAlt.id);
            this.correctAnswer = newIndex;
            return newIndex;
        }
        
        return null;
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
            difficulty: this.difficulty,
            explanation: this.explanation
        };
    }

    clone() {
        return new Question(this.toJSON());
    }

    static fromJSON(json) {
        return new Question(json);
    }
}

export class QuestionManager {
    constructor() {
        this.questions = [];
        this.categories = ['Matemática', 'Português', 'História', 'Geografia', 'Ciências', 'Inglês', 'Física', 'Química', 'Biologia', 'Filosofia', 'Sociologia', 'Artes'];
        this.difficulties = ['fácil', 'médio', 'difícil'];
        this.nextLocalId = 1;
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

    getQuestionByIndex(index) {
        return this.questions[index];
    }

    updateQuestion(id, updates) {
        const index = this.questions.findIndex(q => q.id === id);
        if (index === -1) return null;

        const originalQuestion = this.questions[index];
        const updatedQuestion = new Question({ ...originalQuestion, ...updates });
        
        const errors = updatedQuestion.validate();
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

    clearQuestions() {
        this.questions = [];
    }

    getQuestionsCount() {
        return this.questions.length;
    }

    filterQuestions(filters = {}) {
        return this.questions.filter(question => {
            return Object.entries(filters).every(([key, value]) => {
                if (!value || value === '') return true;
                
                switch (key) {
                    case 'category':
                        return question.category === value;
                    case 'difficulty':
                        return question.difficulty === value;
                    case 'type':
                        return question.type === value;
                    case 'search':
                        const searchTerm = value.toLowerCase();
                        return (
                            question.text.toLowerCase().includes(searchTerm) ||
                            question.category.toLowerCase().includes(searchTerm) ||
                            question.alternatives.some(alt => 
                                alt.text.toLowerCase().includes(searchTerm)
                            )
                        );
                    case 'minPoints':
                        return question.points >= value;
                    case 'maxPoints':
                        return question.points <= value;
                    default:
                        return true;
                }
            });
        });
    }

    searchQuestions(searchTerm) {
        if (!searchTerm) return this.questions;
        
        return this.questions.filter(question => 
            question.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
            question.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            question.alternatives.some(alt => 
                alt.text.toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }

    getTotalPoints() {
        return this.questions.reduce((total, question) => total + question.points, 0);
    }

    getQuestionsByCategory() {
        const byCategory = {};
        this.questions.forEach(question => {
            if (!byCategory[question.category]) {
                byCategory[question.category] = [];
            }
            byCategory[question.category].push(question);
        });
        return byCategory;
    }

    getQuestionsByDifficulty() {
        const byDifficulty = {};
        this.questions.forEach(question => {
            if (!byDifficulty[question.difficulty]) {
                byDifficulty[question.difficulty] = [];
            }
            byDifficulty[question.difficulty].push(question);
        });
        return byDifficulty;
    }

    getQuestionsByType() {
        const byType = {};
        this.questions.forEach(question => {
            if (!byType[question.type]) {
                byType[question.type] = [];
            }
            byType[question.type].push(question);
        });
        return byType;
    }

    exportToJSON() {
        return JSON.stringify({
            questions: this.questions.map(q => q.toJSON()),
            metadata: {
                exportedAt: new Date().toISOString(),
                totalQuestions: this.questions.length,
                totalPoints: this.getTotalPoints()
            }
        }, null, 2);
    }

    importFromJSON(json) {
        try {
            const data = JSON.parse(json);
            
            if (!data.questions || !Array.isArray(data.questions)) {
                throw new Error('Formato inválido: array de questões não encontrado');
            }

            const importedQuestions = data.questions.map(item => {
                try {
                    return Question.fromJSON(item);
                } catch (e) {
                    console.warn('Questão com formato inválido ignorada:', item);
                    return null;
                }
            }).filter(q => q !== null);

            // Validar todas as questões importadas
            const invalidQuestions = importedQuestions.filter(q => {
                const errors = q.validate();
                return errors.length > 0;
            });

            if (invalidQuestions.length > 0) {
                console.warn(`${invalidQuestions.length} questões inválidas foram ignoradas`);
            }

            // Adicionar apenas questões válidas
            const validQuestions = importedQuestions.filter(q => {
                const errors = q.validate();
                return errors.length === 0;
            });

            this.questions = [...this.questions, ...validQuestions];
            return {
                success: true,
                imported: validQuestions.length,
                skipped: importedQuestions.length - validQuestions.length
            };

        } catch (error) {
            console.error('Erro ao importar questões:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    shuffleQuestions() {
        // Fisher-Yates shuffle algorithm
        for (let i = this.questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.questions[i], this.questions[j]] = [this.questions[j], this.questions[i]];
        }
        return this.questions;
    }

    shuffleAllAlternatives() {
        this.questions.forEach(question => {
            if (question.type === 'multiple' || question.type === 'truefalse') {
                question.shuffleAlternatives();
            }
        });
    }

    getStatistics() {
        const total = this.questions.length;
        const byType = this.getQuestionsByType();
        const byCategory = this.getQuestionsByCategory();
        const byDifficulty = this.getQuestionsByDifficulty();

        return {
            total,
            byType: Object.keys(byType).reduce((acc, type) => {
                acc[type] = byType[type].length;
                return acc;
            }, {}),
            byCategory: Object.keys(byCategory).reduce((acc, category) => {
                acc[category] = byCategory[category].length;
                return acc;
            }, {}),
            byDifficulty: Object.keys(byDifficulty).reduce((acc, difficulty) => {
                acc[difficulty] = byDifficulty[difficulty].length;
                return acc;
            }, {}),
            totalPoints: this.getTotalPoints(),
            averagePoints: total > 0 ? (this.getTotalPoints() / total).toFixed(2) : 0
        };
    }

    generateSampleExam(numQuestions, options = {}) {
        let availableQuestions = [...this.questions];
        
        // Aplicar filtros se fornecidos
        if (options.category) {
            availableQuestions = availableQuestions.filter(q => q.category === options.category);
        }
        if (options.difficulty) {
            availableQuestions = availableQuestions.filter(q => q.difficulty === options.difficulty);
        }
        if (options.type) {
            availableQuestions = availableQuestions.filter(q => q.type === options.type);
        }
        if (options.minPoints) {
            availableQuestions = availableQuestions.filter(q => q.points >= options.minPoints);
        }
        if (options.maxPoints) {
            availableQuestions = availableQuestions.filter(q => q.points <= options.maxPoints);
        }

        // Verificar se há questões suficientes
        if (availableQuestions.length < numQuestions) {
            throw new Error(`Não há questões suficientes. Disponível: ${availableQuestions.length}, Solicitado: ${numQuestions}`);
        }

        // Embaralhar e selecionar
        const shuffled = [...availableQuestions];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const selectedQuestions = shuffled.slice(0, numQuestions);

        // Embaralhar alternativas se solicitado
        if (options.shuffleAlternatives) {
            selectedQuestions.forEach(question => {
                if (question.type === 'multiple' || question.type === 'truefalse') {
                    question.shuffleAlternatives();
                }
            });
        }

        return selectedQuestions;
    }
}

export const QuestionType = {
    MULTIPLE: 'multiple',
    TRUEFALSE: 'truefalse',
    ESSAY: 'essay',
    SHORT_ANSWER: 'short_answer'
};

export const QuestionDifficulty = {
    EASY: 'fácil',
    MEDIUM: 'médio',
    HARD: 'difícil'
};

// Instância global
export const questionManager = new QuestionManager();

// Utilitários adicionais
export const QuestionUtils = {
    getTypeLabel(type) {
        const labels = {
            'multiple': 'Múltipla Escolha',
            'truefalse': 'Verdadeiro/Falso',
            'essay': 'Dissertativa',
            'short_answer': 'Resposta Curta'
        };
        return labels[type] || type;
    },

    getDifficultyLabel(difficulty) {
        const labels = {
            'fácil': 'Fácil',
            'médio': 'Médio',
            'difícil': 'Difícil'
        };
        return labels[difficulty] || difficulty;
    },

    getDifficultyColor(difficulty) {
        const colors = {
            'fácil': '#4caf50',
            'médio': '#ff9800',
            'difícil': '#f44336'
        };
        return colors[difficulty] || '#666';
    },

    validateQuestionData(data) {
        const question = new Question(data);
        return question.validate();
    },

    createQuestionPreview(question) {
        return {
            id: question.id,
            text: question.text.substring(0, 100) + (question.text.length > 100 ? '...' : ''),
            type: question.type,
            points: question.points,
            category: question.category,
            difficulty: question.difficulty
        };
    }
};