// serverService.js - Serviços de comunicação com o servidor (CORRIGIDO)
const API_BASE_URL = 'http://localhost:3000/api';

class ServerService {
    constructor() {
        // Verificar se há sessão ativa no localStorage
        const userData = localStorage.getItem('userData');
        if (userData) {
            try {
                this.userData = JSON.parse(userData);
            } catch (e) {
                console.error('Erro ao parsear userData:', e);
                localStorage.removeItem('userData');
            }
        }
    }

    // Método para verificar autenticação
    isAuthenticated() {
        return !!this.userData;
    }

    // Método para verificar se é professor
    isProfessor() {
        return this.userData && this.userData.tipo === 'professor';
    }

    // Método para verificar se é aluno
    isStudent() {
        return this.userData && this.userData.tipo === 'aluno';
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            credentials: 'include', // Importante para cookies de sessão
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                // Sessão expirada
                localStorage.removeItem('userData');
                window.location.href = '/login?error=Sessão expirada';
                throw new Error('Sessão expirada');
            }

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { message: errorText || `Erro HTTP! status: ${response.status}` };
                }
                throw new Error(errorData.message || `Erro HTTP! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Operações de autenticação (COMPATÍVEL COM SEU SERVIDOR)
    async login(cpf, senha, tipo, turma) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ cpf, senha, tipo, turma })
            });
            
            // Primeiro tentamos ler como texto para debug
            const responseText = await response.text();
            console.log('Resposta do login:', responseText);
            
            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Erro ao parsear resposta JSON:', e);
                return { 
                    success: false, 
                    message: 'Resposta inválida do servidor' 
                };
            }
            
            if (data.success && data.user) {
                // Salvar dados do usuário no localStorage
                this.userData = data.user;
                localStorage.setItem('userData', JSON.stringify(data.user));
                
                // Redirecionar conforme o tipo de usuário
                if (data.redirectUrl) {
                    setTimeout(() => {
                        window.location.href = data.redirectUrl;
                    }, 1000);
                }
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
            localStorage.removeItem('userData');
            this.userData = null;
            window.location.href = '/login';
        }
    }

    async checkAuth() {
        try {
            const response = await this.request('/auth/check');
            if (response.authenticated && response.user) {
                this.userData = response.user;
                localStorage.setItem('userData', JSON.stringify(response.user));
            }
            return response;
        } catch (error) {
            console.error('Auth check error:', error);
            return { authenticated: false };
        }
    }

    // Operações de provas (COMPATÍVEL COM SEU SERVIDOR)
    async saveExam(examData) {
        try {
            return await this.request('/salvar-prova', {
                method: 'POST',
                body: examData
            });
        } catch (error) {
            console.error('Save exam error:', error);
            return { 
                success: false, 
                message: error.message || 'Erro ao salvar prova' 
            };
        }
    }

    async createExam(examData) {
        try {
            return await this.request('/provas', {
                method: 'POST',
                body: examData
            });
        } catch (error) {
            console.error('Create exam error:', error);
            return { 
                success: false, 
                message: error.message || 'Erro ao criar prova' 
            };
        }
    }

    async getAvailableExams() {
        try {
            return await this.request('/exams');
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

    // Verificar se o aluno já realizou a prova (ATUALIZADO)
    async checkExamAttempt(examId) {
        try {
            if (!this.userData || !this.userData.cpf) {
                return { attempted: false, error: 'Usuário não autenticado' };
            }
            
            const response = await this.request(`/exams/${examId}/attempt/${this.userData.cpf}`);
            return response;
        } catch (error) {
            console.error('Check exam attempt error:', error);
            return { attempted: false, error: error.message };
        }
    }

    // Enviar respostas da prova (ATUALIZADO)
    async submitExamAnswers(examId, answers) {
        try {
            if (!this.userData || !this.userData.cpf) {
                return { 
                    success: false, 
                    message: 'Usuário não autenticado' 
                };
            }
            
            return await this.request(`/exams/${examId}/submit`, {
                method: 'POST',
                body: {
                    studentCpf: this.userData.cpf,
                    answers: answers
                }
            });
        } catch (error) {
            console.error('Submit exam error:', error);
            return { 
                success: false, 
                message: error.message || 'Erro ao enviar respostas' 
            };
        }
    }

    // Gerar link único para aluno (PARA PROFESSORES)
    async generateUniqueLink(provaId, alunoCpf) {
        try {
            return await this.request('/gerar-link-unico', {
                method: 'POST',
                body: { prova_id: provaId, aluno_cpf: alunoCpf }
            });
        } catch (error) {
            console.error('Generate unique link error:', error);
            return { 
                success: false, 
                message: error.message || 'Erro ao gerar link único' 
            };
        }
    }

    // Cadastro de usuários
    async registerUser(userData) {
        try {
            return await this.request('/cadastro', {
                method: 'POST',
                body: userData
            });
        } catch (error) {
            console.error('Register user error:', error);
            return { 
                success: false, 
                message: error.message || 'Erro ao cadastrar usuário' 
            };
        }
    }
}

// Instância global
window.serverService = new ServerService();

// Verificar autenticação automaticamente ao carregar
document.addEventListener('DOMContentLoaded', function() {
    serverService.checkAuth().then(authStatus => {
        console.log('Status de autenticação:', authStatus);
        
        // Se não está autenticado e não está na página de login, redirecionar
        if (!authStatus.authenticated && !window.location.pathname.includes('login')) {
            window.location.href = '/login';
        }
        
        // Se está autenticado e está na página de login, redirecionar para dashboard
        if (authStatus.authenticated && window.location.pathname.includes('login')) {
            const redirectUrl = authStatus.user.tipo === 'professor' ? '/professor' : '/aluno';
            window.location.href = redirectUrl;
        }
    });
});