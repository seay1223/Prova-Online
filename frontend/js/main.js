// main.js - Ponto de entrada principal do sistema

import { serverService } from './serverSevice.js';
import { uiManager } from './uiManager.js';
import { ExamCreator } from './criarprova.js';
import { questionManager } from './questionManager.js';
import { alternativeManager } from './alternativeManager.js';

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

    showLoginView() {
        this.hideAllViews();
        document.getElementById('login-view').style.display = 'block';
        this.currentView = 'login';
    }

    showDashboard() {
        this.hideAllViews();
        document.getElementById('dashboard-view').style.display = 'block';
        this.currentView = 'dashboard';
        this.updateUserInfo();
        this.loadDashboardData();
    }

    showExamCreation() {
        this.hideAllViews();
        document.getElementById('exam-creation-view').style.display = 'block';
        this.currentView = 'exam-creation';
        
        // Inicializar o criador de provas se ainda não foi inicializado
        if (!window.examCreator) {
            window.examCreator = new ExamCreator();
        }
    }

    showExamList() {
        this.hideAllViews();
        document.getElementById('exam-list-view').style.display = 'block';
        this.currentView = 'exam-list';
        this.loadExams();
    }

    hideAllViews() {
        const views = document.querySelectorAll('.view');
        views.forEach(view => {
            view.style.display = 'none';
        });
    }

    setupNavigation() {
        // Navegação principal
        document.getElementById('nav-dashboard').addEventListener('click', (e) => {
            e.preventDefault();
            this.showDashboard();
        });

        document.getElementById('nav-create-exam').addEventListener('click', (e) => {
            e.preventDefault();
            this.showExamCreation();
        });

        document.getElementById('nav-exam-list').addEventListener('click', (e) => {
            e.preventDefault();
            this.showExamList();
        });

        document.getElementById('nav-logout').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    }

    setupEventListeners() {
        // Filtros na lista de provas
        document.getElementById('exam-filter').addEventListener('change', (e) => {
            this.filterExams(e.target.value);
        });

        document.getElementById('exam-search').addEventListener('input', (e) => {
            this.searchExams(e.target.value);
        });

        // Botões de ação
        document.getElementById('btn-new-exam').addEventListener('click', () => {
            this.showExamCreation();
        });
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const userType = document.getElementById('login-type').value;

        if (!email || !password) {
            uiManager.showNotification('Por favor, preencha todos os campos.', 'error');
            return;
        }

        try {
            uiManager.showLoading('Entrando...');
            const result = await serverService.login(email, password, userType);
            
            if (result.success) {
                this.currentUser = result.user;
                localStorage.setItem('userData', JSON.stringify(result.user));
                uiManager.showNotification('Login realizado com sucesso!', 'success');
                this.showDashboard();
            } else {
                uiManager.showNotification(result.message, 'error');
            }
        } catch (error) {
            console.error('Erro no login:', error);
            uiManager.showNotification('Erro ao conectar com o servidor.', 'error');
        } finally {
            uiManager.hideLoading();
        }
    }

    async logout() {
        try {
            await serverService.logout();
        } catch (error) {
            console.error('Erro no logout:', error);
        } finally {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            this.currentUser = null;
            this.showLoginView();
        }
    }

    updateUserInfo() {
        if (this.currentUser) {
            document.getElementById('user-name').textContent = this.currentUser.name;
            document.getElementById('user-email').textContent = this.currentUser.email;
            document.getElementById('user-type').textContent = this.currentUser.type === 'teacher' ? 'Professor' : 'Aluno';
        }
    }

    async loadDashboardData() {
        if (this.currentUser.type === 'teacher') {
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
            // Dashboard para alunos
            document.getElementById('teacher-dashboard').style.display = 'none';
            document.getElementById('student-dashboard').style.display = 'block';
            this.loadStudentData();
        }
    }

    renderRecentExams(exams) {
        const container = document.getElementById('recent-exams');
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
                    <span>${uiManager.formatDate(exam.date)}</span>
                    <span>${uiManager.formatTime(exam.duration)}</span>
                    <span class="status ${exam.published ? 'published' : 'draft'}">
                        ${exam.published ? 'Publicada' : 'Rascunho'}
                    </span>
                </div>
                <div class="exam-actions">
                    <button class="btn-small" data-action="view" data-id="${exam.id}">Ver</button>
                    <button class="btn-small" data-action="edit" data-id="${exam.id}">Editar</button>
                </div>
            `;
            container.appendChild(examElement);
        });
        
        // Adicionar event listeners aos botões
        container.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const examId = e.target.dataset.id;
                this.handleExamAction(action, examId);
            });
        });
    }

    handleExamAction(action, examId) {
        switch (action) {
            case 'view':
                this.viewExam(examId);
                break;
            case 'edit':
                this.editExam(examId);
                break;
            case 'delete':
                this.deleteExam(examId);
                break;
        }
    }

    async loadExams() {
        try {
            uiManager.showLoading('Carregando provas...');
            const exams = await serverService.getExams();
            this.exams = exams;
            this.renderExamList(exams);
        } catch (error) {
            console.error('Erro ao carregar provas:', error);
            uiManager.showNotification('Erro ao carregar a lista de provas.', 'error');
        } finally {
            uiManager.hideLoading();
        }
    }

    renderExamList(exams) {
        const container = document.getElementById('exam-list');
        container.innerHTML = '';
        
        if (exams.length === 0) {
            container.innerHTML = '<p class="no-data">Nenhuma prova encontrada.</p>';
            return;
        }
        
        exams.forEach(exam => {
            const examElement = document.createElement('div');
            examElement.className = 'exam-list-item';
            examElement.innerHTML = `
                <div class="exam-info">
                    <h4>${exam.title}</h4>
                    <p>${exam.description || 'Sem descrição'}</p>
                    <div class="exam-meta">
                        <span>Data: ${uiManager.formatDate(exam.date)}</span>
                        <span>Duração: ${uiManager.formatTime(exam.duration)}</span>
                        <span>Questões: ${exam.questions?.length || 0}</span>
                        <span class="status ${exam.published ? 'published' : 'draft'}">
                            ${exam.published ? 'Publicada' : 'Rascunho'}
                        </span>
                    </div>
                </div>
                <div class="exam-actions">
                    <button class="btn-small" data-action="view" data-id="${exam.id}">Ver</button>
                    <button class="btn-small" data-action="edit" data-id="${exam.id}">Editar</button>
                    <button class="btn-small btn-danger" data-action="delete" data-id="${exam.id}">Excluir</button>
                </div>
            `;
            container.appendChild(examElement);
        });
        
        // Adicionar event listeners aos botões
        container.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const examId = e.target.dataset.id;
                this.handleExamAction(action, examId);
            });
        });
    }

    filterExams(filter) {
        let filteredExams = this.exams;
        
        switch (filter) {
            case 'published':
                filteredExams = this.exams.filter(exam => exam.published);
                break;
            case 'draft':
                filteredExams = this.exams.filter(exam => !exam.published);
                break;
            case 'recent':
                filteredExams = [...this.exams].sort((a, b) => 
                    new Date(b.createdAt) - new Date(a.createdAt)
                );
                break;
        }
        
        this.renderExamList(filteredExams);
    }

    searchExams(query) {
        if (!query) {
            this.renderExamList(this.exams);
            return;
        }
        
        const filteredExams = this.exams.filter(exam => 
            exam.title.toLowerCase().includes(query.toLowerCase()) ||
            (exam.description && exam.description.toLowerCase().includes(query.toLowerCase()))
        );
        
        this.renderExamList(filteredExams);
    }

    async viewExam(examId) {
        try {
            uiManager.showLoading('Carregando prova...');
            const exam = await serverService.getExam(examId);
            
            const modal = uiManager.showModal(
                exam.title,
                `
                <div class="exam-details">
                    <p><strong>Descrição:</strong> ${exam.description || 'Nenhuma'}</p>
                    <p><strong>Data:</strong> ${uiManager.formatDate(exam.date)}</p>
                    <p><strong>Duração:</strong> ${uiManager.formatTime(exam.duration)}</p>
                    <p><strong>Status:</strong> ${exam.published ? 'Publicada' : 'Rascunho'}</p>
                    <p><strong>Questões:</strong> ${exam.questions?.length || 0}</p>
                    
                    <div class="questions-preview">
                        <h4>Questões:</h4>
                        ${exam.questions ? exam.questions.map((q, i) => `
                            <div class="question-preview">
                                <p><strong>${i + 1}. ${q.text}</strong></p>
                                ${q.type !== 'essay' ? `
                                    <div class="alternatives-preview">
                                        ${q.alternatives.map((alt, j) => `
                                            <div class="${alt.correct ? 'correct' : ''}">
                                                ${String.fromCharCode(65 + j)}. ${alt.text}
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : '<p>(Questão dissertativa)</p>'}
                            </div>
                        `).join('') : '<p>Nenhuma questão</p>'}
                    </div>
                </div>
                `,
                {
                    footer: `
                        <button class="btn-secondary" id="close-modal">Fechar</button>
                        ${this.currentUser.type === 'teacher' ? `
                            <button class="btn-primary" id="edit-exam" data-id="${exam.id}">Editar</button>
                        ` : ''}
                    `
                }
            );
            
            modal.element.querySelector('#close-modal').addEventListener('click', () => {
                modal.close();
            });
            
            if (this.currentUser.type === 'teacher') {
                modal.element.querySelector('#edit-exam').addEventListener('click', () => {
                    modal.close();
                    this.editExam(examId);
                });
            }
            
        } catch (error) {
            console.error('Erro ao carregar prova:', error);
            uiManager.showNotification('Erro ao carregar os detalhes da prova.', 'error');
        } finally {
            uiManager.hideLoading();
        }
    }

    editExam(examId) {
        uiManager.showNotification('Funcionalidade de edição em desenvolvimento.', 'info');
        // Aqui você implementaria a edição da prova
    }

    async deleteExam(examId) {
        if (!confirm('Tem certeza que deseja excluir esta prova? Esta ação não pode ser desfeita.')) {
            return;
        }
        
        try {
            uiManager.showLoading('Excluindo prova...');
            const result = await serverService.deleteExam(examId);
            
            if (result.success) {
                uiManager.showNotification('Prova excluída com sucesso.', 'success');
                this.loadExams(); // Recarregar a lista
            } else {
                uiManager.showNotification('Erro ao excluir prova: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao excluir prova:', error);
            uiManager.showNotification('Erro ao excluir a prova.', 'error');
        } finally {
            uiManager.hideLoading();
        }
    }

    async loadStudentData() {
        try {
            uiManager.showLoading('Carregando suas provas...');
            const exams = await serverService.getExams();
            const studentExams = exams.filter(exam => 
                exam.published && (!exam.assignedStudents || exam.assignedStudents.includes(this.currentUser.id))
            );
            
            this.renderStudentExams(studentExams);
        } catch (error) {
            console.error('Erro ao carregar provas do aluno:', error);
            uiManager.showNotification('Erro ao carregar suas provas.', 'error');
        } finally {
            uiManager.hideLoading();
        }
    }

    renderStudentExams(exams) {
        const container = document.getElementById('student-exams');
        container.innerHTML = '';
        
        if (exams.length === 0) {
            container.innerHTML = '<p class="no-data">Nenhuma prova disponível no momento.</p>';
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
                    <button class="btn-primary" data-action="take-exam" data-id="${exam.id}">Realizar Prova</button>
                </div>
            `;
            container.appendChild(examElement);
        });
        
        // Adicionar event listeners aos botões
        container.querySelectorAll('[data-action="take-exam"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const examId = e.target.dataset.id;
                this.takeExam(examId);
            });
        });
    }

    takeExam(examId) {
        uiManager.showNotification('Funcionalidade de realizar prova em desenvolvimento.', 'info');
        // Aqui você implementaria a interface para o aluno realizar a prova
    }

    loadInitialData() {
        // Carregar dados iniciais se necessário
    }
}

// Inicializar a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MainApp();
});

export default MainApp;