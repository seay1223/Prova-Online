// serverService.js - Serviços de comunicação com o servidor

const API_BASE_URL = 'http://localhost:3000/api';

class ServerService {
    constructor() {
        this.token = localStorage.getItem('authToken');
    }

    setAuthToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` }),
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                // Token expirado ou inválido
                localStorage.removeItem('authToken');
                window.location.href = '/login';
                throw new Error('Sessão expirada');
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Operações de autenticação
    async login(email, password, tipo) {
        const response = await this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ email, senha: password, tipo })
        });
        
        if (response.success && response.token) {
            this.setAuthToken(response.token);
        }
        
        return response;
    }

    async logout() {
        await this.request('/logout', { method: 'POST' });
        localStorage.removeItem('authToken');
        this.token = null;
    }

    // Operações de provas
    async saveExam(examData) {
        return await this.request('/exams', {
            method: 'POST',
            body: JSON.stringify(examData)
        });
    }

    async updateExam(examId, examData) {
        return await this.request(`/exams/${examId}`, {
            method: 'PUT',
            body: JSON.stringify(examData)
        });
    }

    async getExams() {
        return await this.request('/exams');
    }

    async getExam(examId) {
        return await this.request(`/exams/${examId}`);
    }

    async deleteExam(examId) {
        return await this.request(`/exams/${examId}`, {
            method: 'DELETE'
        });
    }

    // Operações de questões
    async addQuestion(examId, questionData) {
        return await this.request(`/exams/${examId}/questions`, {
            method: 'POST',
            body: JSON.stringify(questionData)
        });
    }

    async updateQuestion(examId, questionId, questionData) {
        return await this.request(`/exams/${examId}/questions/${questionId}`, {
            method: 'PUT',
            body: JSON.stringify(questionData)
        });
    }

    async deleteQuestion(examId, questionId) {
        return await this.request(`/exams/${examId}/questions/${questionId}`, {
            method: 'DELETE'
        });
    }

    // Operações de alunos
    async assignStudents(examId, students) {
        return await this.request(`/exams/${examId}/students`, {
            method: 'POST',
            body: JSON.stringify({ students })
        });
    }

    async getExamResults(examId) {
        return await this.request(`/exams/${examId}/results`);
    }

    // Upload de arquivos
    async uploadFile(file, examId) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('examId', examId);

        return await this.request('/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`
            },
            body: formData
        });
    }
}

// Instância singleton
export const serverService = new ServerService();