class MainApp {
    constructor() {
        this.currentUser = null;
        this.currentView = 'login';
        this.exams = [];
        this.init();
    }

    async init() {
        this.checkAuthStatus();
        this.setupNavigation();
        this.setupEventListeners();
        this.loadInitialData();
    }

    checkAuthStatus() {
        // Verificar se serverService está disponível
        if (typeof serverService === 'undefined') {
            console.error('serverService não está disponível');
            this.showLoginView();
            return;
        }
        
        // Verificar autenticação com o servidor
        serverService.checkAuth().then(authStatus => {
            if (authStatus.authenticated) {
                this.currentUser = authStatus.user;
                this.showDashboard();
            } else {
                this.showLoginView();
            }
        }).catch(error => {
            console.error('Erro ao verificar autenticação:', error);
            this.showLoginView();
        });
    }

    showLoginView() {
        document.getElementById('login-view').style.display = 'block';
        document.getElementById('dashboard-view').style.display = 'none';
        document.getElementById('exam-view').style.display = 'none';
        this.currentView = 'login';
    }

    showDashboard() {
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('dashboard-view').style.display = 'block';
        document.getElementById('exam-view').style.display = 'none';
        this.currentView = 'dashboard';
        this.loadDashboardData();
    }

    showExamView() {
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('dashboard-view').style.display = 'none';
        document.getElementById('exam-view').style.display = 'block';
        this.currentView = 'exam';
    }

    setupNavigation() {
        // Configurar navegação
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.target.getAttribute('data-target');
                if (target === 'logout') {
                    this.logout();
                } else if (target === 'dashboard') {
                    this.showDashboard();
                } else if (target === 'create-exam') {
                    this.showCreateExam();
                }
            });
        });
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Create exam button
        const createExamBtn = document.getElementById('create-exam-btn');
        if (createExamBtn) {
            createExamBtn.addEventListener('click', () => {
                this.showCreateExam();
            });
        }
    }

    async handleLogin() {
        const cpf = document.getElementById('cpf').value;
        const senha = document.getElementById('password').value;
        const tipo = document.querySelector('input[name="tipo"]:checked')?.value;
        const turma = tipo === 'aluno' 
            ? document.getElementById('turmaAluno').value 
            : document.getElementById('turmaProfessor').value;

        if (!cpf || !senha || !tipo || !turma) {
            this.showNotification('Preencha todos os campos', 'error');
            return;
        }

        try {
            const result = await serverService.login(cpf, senha, tipo, turma);
            if (result.success) {
                this.currentUser = result.user;
                this.showDashboard();
                this.showNotification('Login realizado com sucesso!', 'success');
            } else {
                this.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            this.showNotification('Erro ao fazer login', 'error');
        }
    }

    async logout() {
        try {
            await serverService.logout();
            this.currentUser = null;
            this.showLoginView();
            this.showNotification('Logout realizado com sucesso', 'success');
        } catch (error) {
            console.error('Erro no logout:', error);
            this.showNotification('Erro ao fazer logout', 'error');
        }
    }

    async loadDashboardData() {
        if (!this.currentUser) return;

        if (this.currentUser.tipo === 'professor') {
            // Dashboard para professores
            try {
                this.showLoading('Carregando dados...');
                const exams = await serverService.getAvailableExams();
                this.exams = exams;
                
                // Estatísticas para o dashboard
                const totalExams = exams.length;
                const activeExams = exams.filter(e => new Date(e.data_limite) > new Date()).length;
                const expiredExams = exams.filter(e => new Date(e.data_limite) <= new Date()).length;
                
                document.getElementById('total-exams').textContent = totalExams;
                document.getElementById('active-exams').textContent = activeExams;
                document.getElementById('expired-exams').textContent = expiredExams;
                
                // Listar provas recentes
                this.renderRecentExams(exams.slice(0, 5));
                
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                this.showNotification('Erro ao carregar dados do dashboard.', 'error');
            } finally {
                this.hideLoading();
            }
        } else {
            // Dashboard para alunos
            document.getElementById('teacher-dashboard').style.display = 'none';
            document.getElementById('student-dashboard').style.display = 'block';
            await this.loadStudentData();
        }
    }

    async loadStudentData() {
        try {
            this.showLoading('Carregando suas provas...');
            
            // Buscar provas disponíveis para o aluno
            const exams = await serverService.getAvailableExams();
            
            // Verificar tentativas para cada prova
            const examsWithAttempts = await Promise.all(
                exams.map(async exam => {
                    const attempt = await serverService.checkExamAttempt(exam.id);
                    return {
                        ...exam,
                        attempted: attempt.attempted || false
                    };
                })
            );
            
            // Separar provas pendentes e concluídas
            const pendingExams = examsWithAttempts.filter(exam => !exam.attempted);
            const completedExams = examsWithAttempts.filter(exam => exam.attempted);
            
            this.renderStudentExams(pendingExams, 'pending-exams');
            this.renderStudentExams(completedExams, 'completed-exams');
            
            // Atualizar estatísticas
            document.getElementById('total-available').textContent = pendingExams.length;
            document.getElementById('total-completed').textContent = completedExams.length;
            
        } catch (error) {
            console.error('Erro ao carregar provas do aluno:', error);
            this.showNotification('Erro ao carregar suas provas.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    renderStudentExams(exams, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (exams.length === 0) {
            container.innerHTML = '<p class="no-data">Nenhuma prova encontrada.</p>';
            return;
        }
        
        exams.forEach(exam => {
            const examElement = document.createElement('div');
            examElement.className = 'exam-card';
            examElement.innerHTML = `
                <h4>${exam.titulo}</h4>
                <p>${exam.descricao || 'Sem descrição'}</p>
                <div class="exam-meta">
                    <span>Data limite: ${this.formatDate(exam.data_limite)}</span>
                    <span>Duração: ${this.formatTime(exam.tempo_limite)}</span>
                    <span>Disciplina: ${exam.disciplina}</span>
                </div>
                <div class="exam-actions">
                    ${exam.attempted ? 
                        `<button class="btn-secondary" data-action="view-result" data-id="${exam.id}">Ver Resultado</button>` :
                        `<button class="btn-primary" data-action="take-exam" data-id="${exam.id}">Realizar Prova</button>`
                    }
                </div>
            `;
            container.appendChild(examElement);
        });
        
        // Adicionar event listeners aos botões
        container.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const examId = e.target.dataset.id;
                
                if (action === 'take-exam') {
                    this.takeExam(examId);
                } else if (action === 'view-result') {
                    this.viewExamResult(examId);
                }
            });
        });
    }

    takeExam(examId) {
        window.location.href = `/aluno/acesso/prova.html?id=${examId}`;
    }

    viewExamResult(examId) {
        this.showNotification('Visualização de resultados em desenvolvimento.', 'info');
    }

    showCreateExam() {
        window.location.href = '/professor/criarprova.html';
    }

    showNotification(message, type = 'info') {
        // Usar uiManager se disponível, senão implementação básica
        if (typeof uiManager !== 'undefined') {
            uiManager.showNotification(message, type);
        } else {
            // Implementação básica de notificação
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px;
                background: ${type === 'error' ? '#ffebee' : type === 'success' ? '#e8f5e9' : '#e3f2fd'};
                color: ${type === 'error' ? '#c62828' : type === 'success' ? '#2e7d32' : '#1565c0'};
                border-radius: 4px;
                z-index: 1000;
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 5000);
        }
    }

    showLoading(message) {
        if (typeof uiManager !== 'undefined') {
            uiManager.showLoading(message);
        } else {
            // Implementação básica de loading
            console.log('Loading:', message);
        }
    }

    hideLoading() {
        if (typeof uiManager !== 'undefined') {
            uiManager.hideLoading();
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }

    formatTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
    }

    loadInitialData() {
        // Carregar dados iniciais se necessário
    }
}

// Inicializar a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se as dependências estão carregadas
    if (typeof serverService === 'undefined') {
        console.error('serverService não foi carregado');
        return;
    }

    // Inicializar a aplicação
    window.app = new MainApp();
});