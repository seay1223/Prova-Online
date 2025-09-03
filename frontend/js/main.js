// main.js - Ponto de entrada principal (ATUALIZADO)
import { serverService } from './serverService.js';
import { uiManager } from './uiManager.js';

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
        const token = localStorage.getItem('authToken');
        const userData = localStorage.getItem('userData');
        
        if (token && userData) {
            try {
                this.currentUser = JSON.parse(userData);
                this.showDashboard();
            } catch (error) {
                console.error('Erro ao recuperar dados do usuário:', error);
                this.showLoginView();
            }
        } else {
            this.showLoginView();
        }
    }

    // ... (outros métodos permanecem iguais)

    async loadDashboardData() {
        if (this.currentUser.type === 'teacher') {
            // Dashboard para professores (código existente)
            try {
                uiManager.showLoading('Carregando dados...');
                const exams = await serverService.getExams();
                this.exams = exams;
                
                // Estatísticas para o dashboard
                const totalExams = exams.length;
                const publishedExams = exams.filter(e => e.published).length;
                const examsWithResults = exams.filter(e => e.hasResults).length;
                
                document.getElementById('total-exams').textContent = totalExams;
                document.getElementById('published-exams').textContent = publishedExams;
                document.getElementById('exams-with-results').textContent = examsWithResults;
                
                // Listar provas recentes
                this.renderRecentExams(exams.slice(0, 5));
                
            } catch (error) {
                console.error('Erro ao carregar dados:', error);
                uiManager.showNotification('Erro ao carregar dados do dashboard.', 'error');
            } finally {
                uiManager.hideLoading();
            }
        } else {
            // DASHBOARD PARA ALUNOS - NOVA IMPLEMENTAÇÃO
            document.getElementById('teacher-dashboard').style.display = 'none';
            document.getElementById('student-dashboard').style.display = 'block';
            await this.loadStudentData();
        }
    }

    async loadStudentData() {
        try {
            uiManager.showLoading('Carregando suas provas...');
            
            // Buscar provas disponíveis para o aluno
            const exams = await serverService.getAvailableExams();
            
            // Separar provas pendentes e concluídas
            const pendingExams = exams.filter(exam => !exam.attempted);
            const completedExams = exams.filter(exam => exam.attempted);
            
            this.renderStudentExams(pendingExams, 'pending-exams');
            this.renderStudentExams(completedExams, 'completed-exams');
            
            // Atualizar estatísticas
            document.getElementById('total-available').textContent = pendingExams.length;
            document.getElementById('total-completed').textContent = completedExams.length;
            
        } catch (error) {
            console.error('Erro ao carregar provas do aluno:', error);
            uiManager.showNotification('Erro ao carregar suas provas.', 'error');
        } finally {
            uiManager.hideLoading();
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
                <h4>${exam.title}</h4>
                <p>${exam.description || 'Sem descrição'}</p>
                <div class="exam-meta">
                    <span>Data: ${uiManager.formatDate(exam.date)}</span>
                    <span>Duração: ${uiManager.formatTime(exam.duration)}</span>
                    <span>Questões: ${exam.questions?.length || 0}</span>
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
        window.location.href = `realizar-prova.html?id=${examId}`;
    }

    viewExamResult(examId) {
        uiManager.showNotification('Visualização de resultados em desenvolvimento.', 'info');
        // window.location.href = `resultado-prova.html?id=${examId}`;
    }

    // ... (restante do código)
}

// Inicializar a aplicação
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MainApp();
});