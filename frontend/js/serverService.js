// serverService.js - Serviços de comunicação com o servidor (CORRIGIDO)
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
                localStorage.removeItem('userData');
                window.location.href = '/login';
                throw new Error('Sessão expirada');
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Erro HTTP! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Operações de autenticação
    async login(email, password, tipo) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, senha: password, tipo })
            });
            
            const data = await response.json();
            
            if (data.success && data.token) {
                this.setAuthToken(data.token);
                // Salvar dados do usuário
                localStorage.setItem('userData', JSON.stringify(data.user));
            }
            
            return data;
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                message: error.message || 'Erro ao fazer login' 
            };
        }
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            this.token = null;
        }
    }

    // Operações de provas
    async saveExam(examData) {
        try {
            return await this.request('/exams', {
                method: 'POST',
                body: JSON.stringify({
                    ...examData,
                    published: true,
                    createdAt: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Save exam error:', error);
            return { 
                success: false, 
                message: error.message || 'Erro ao salvar prova' 
            };
        }
    }

    async getAvailableExams() {
        try {
            return await this.request('/exams/available');
        } catch (error) {
            console.error('Get available exams error:', error);
            return [];
        }
    }

    async getExam(examId) {
        try {
            return await this.request(`/exams/${examId}`);
        } catch (error) {
            console.error('Get exam error:', error);
            return null;
        }
    }

    // Verificar se o aluno já realizou a prova (CORREÇÃO)
    async checkExamAttempt(examId, studentId) {
        try {
            const response = await this.request(`/exams/${examId}/attempt/${studentId}`);
            return response;
        } catch (error) {
            console.error('Check exam attempt error:', error);
            return { attempted: false, error: error.message };
        }
    }

    // Enviar respostas da prova
    async submitExamAnswers(examId, answers) {
        try {
            return await this.request(`/exams/${examId}/submit`, {
                method: 'POST',
                body: JSON.stringify({ answers })
            });
        } catch (error) {
            console.error('Submit exam error:', error);
            return { 
                success: false, 
                message: error.message || 'Erro ao enviar respostas' 
            };
        }
    }
}

// Instância singleton
window.serverService = new ServerService();