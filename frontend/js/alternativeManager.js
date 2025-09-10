class AlternativeManager {
    constructor() {
        this.alternatives = [];
        this.nextId = 1;
    }

    addAlternative(text = '', correct = false) {
        const alternative = {
            id: this.nextId++,
            text: text.trim(),
            correct: correct
        };
        
        this.alternatives.push(alternative);
        return alternative;
    }

    removeAlternative(id) {
        const index = this.alternatives.findIndex(alt => alt.id === id);
        if (index !== -1) {
            this.alternatives.splice(index, 1);
            return true;
        }
        return false;
    }

    updateAlternative(id, updates) {
        const alternative = this.alternatives.find(alt => alt.id === id);
        if (alternative) {
            Object.assign(alternative, updates);
            return alternative;
        }
        return null;
    }

    getAlternative(id) {
        return this.alternatives.find(alt => alt.id === id);
    }

    clearAlternatives() {
        this.alternatives = [];
        this.nextId = 1;
    }

    validateAlternatives() {
        const errors = [];

        if (this.alternatives.length < 2) {
            errors.push('É necessário pelo menos 2 alternativas');
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
            this.alternatives.some((a, i) => i !== index && a.text.toLowerCase() === alt.text.toLowerCase())
        );
        if (duplicateTexts) {
            errors.push('Existem alternativas com texto duplicado');
        }

        return errors;
    }

    shuffleAlternatives() {
        // Salvar qual é a correta
        const correctIndex = this.alternatives.findIndex(alt => alt.correct);
        
        // Embaralhar array
        for (let i = this.alternatives.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.alternatives[i], this.alternatives[j]] = [this.alternatives[j], this.alternatives[i]];
        }
        
        // Retornar o novo índice da correta
        return this.alternatives.findIndex(alt => alt.correct);
    }

    toJSON() {
        return this.alternatives;
    }

    fromJSON(data) {
        if (Array.isArray(data)) {
            this.alternatives = data;
            this.nextId = Math.max(...data.map(alt => alt.id), 0) + 1;
        }
    }
}

// Instância global
const alternativeManager = new AlternativeManager();