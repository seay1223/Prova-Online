class Question {
    constructor(data) {
        this.id = data.id || Date.now() + Math.random().toString(36).substr(2, 9);
        this.text = data.text || '';
        this.type = data.type || 'multiple';
        this.alternatives = data.alternatives || [];
        this.correctAnswer = data.correctAnswer !== undefined ? data.correctAnswer : null;
        this.points = data.points || 1;
    }
}

class ExamCreator {
    constructor() {
        this.examData = {
            title: '',
            description: '',
            duration: 60,
            date: '',
            questions: [],
            published: true // Garantir que a prova seja publicada por padrão
        };
        
        this.currentQuestion = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setMinDate();
        this.toggleAlternatives('multiple');
        this.loadDraft();
    }

    // ... (o restante do código permanece igual até o método saveExam)

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
            
            // Usar o serverService real em vez da função simulada
            const result = await serverService.saveExam(this.examData);
            
            if (result.success) {
                showNotification('Prova salva e publicada com sucesso!', 'success');
                this.clearDraft();
                this.examData.questions = [];
                this.displayQuestions();
                
                // Limpar formulário principal
                document.getElementById('exam-title').value = '';
                document.getElementById('exam-description').value = '';
                document.getElementById('exam-time').value = '60';
                document.getElementById('exam-date').value = '';
                
                // Opcional: Redirecionar para lista de provas após 2 segundos
                setTimeout(() => {
                    window.location.href = 'listar-provas.html';
                }, 2000);
            } else {
                showNotification('Erro ao salvar prova: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Erro ao salvar prova:', error);
            showNotification('Erro ao conectar com o servidor.', 'error');
        }
    }

    // ... (o restante do código permanece igual)
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Verificar se é professor
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    if (userData.type !== 'teacher') {
        alert('Acesso restrito a professores.');
        window.location.href = 'dashboard.html';
        return;
    }
    
    window.examCreator = new ExamCreator();
});

// Funções de interface do usuário
function showNotification(message, type) {
    // Implementação da notificação
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px;
        border-radius: 5px;
        color: white;
        z-index: 1000;
        ${type === 'success' ? 'background-color: #4CAF50;' : ''}
        ${type === 'error' ? 'background-color: #f44336;' : ''}
        ${type === 'info' ? 'background-color: #2196F3;' : ''}
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function clearNotifications() {
    const notifications = document.querySelectorAll('.notification');
    notifications.forEach(notification => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    });
}