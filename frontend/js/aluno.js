// aluno.js - Página do aluno (COMPLETO E CORRIGIDO)
console.log('aluno.js carregado - versão final');

// Serviço simplificado para comunicação com a API
window.serverService = {
    // Buscar provas disponíveis
    getAvailableExams: async function() {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                console.log('Nenhum token encontrado');
                return [];
            }
            
            console.log('Buscando provas disponíveis...');
            const response = await fetch('/api/exams/available', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 401) {
                console.log('Token inválido ou expirado');
                localStorage.removeItem('userData');
                localStorage.removeItem('authToken');
                window.location.href = '/login';
                return [];
            }
            
            if (!response.ok) {
                throw new Error(`Erro HTTP ${response.status} ao buscar provas`);
            }
            
            const data = await response.json();
            console.log('Provas recebidas:', data);
            return data;
            
        } catch (error) {
            console.error('Erro ao buscar provas:', error);
            return [];
        }
    },
    
    // Verificar se aluno já tentou a prova
    checkExamAttempt: async function(examId, studentId) {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`/api/exams/${examId}/attempt/${studentId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                return await response.json();
            }
            return { attempted: false };
        } catch (error) {
            console.error('Erro ao verificar tentativa:', error);
            return { attempted: false };
        }
    }
};

// Função principal quando o documento carrega
document.addEventListener('DOMContentLoaded', function() {
    console.log('Página do aluno carregando...');
    
    // Verificar autenticação
    const userData = localStorage.getItem('userData');
    const authToken = localStorage.getItem('authToken');

    if (!userData || !authToken) {
        console.log('Usuário não logado. Redirecionando...');
        alert('Você precisa estar logado para acessar esta página!');
        window.location.href = '/login';
        return;
    }

    try {
        const user = JSON.parse(userData);
        console.log('Usuário:', user);
        
        // Verificar tipo de usuário
        const userType = user.tipo || user.type || user.role;
        if (userType !== 'aluno' && userType !== 'student') {
            alert('Acesso restrito a alunos.');
            window.location.href = '/dashboard';
            return;
        }
        
        // Exibir informações do usuário
        updateUserInfo(user);
        
        // Carregar provas disponíveis
        loadAvailableExams(user.id || user.email);

    } catch (e) {
        console.error('Erro ao carregar dados:', e);
        handleAuthError();
        return;
    }

    // Configurar event listeners
    setupEventListeners();
});

// Atualizar informações do usuário na interface
function updateUserInfo(user) {
    const userEmail = user.email || 'Aluno';
    const userName = user.name || user.nome || userEmail.split('@')[0] || 'Aluno';
    const userType = user.tipo || user.type || 'aluno';
    
    if (document.getElementById('userEmail')) {
        document.getElementById('userEmail').textContent = userEmail;
    }
    if (document.getElementById('userName')) {
        document.getElementById('userName').textContent = userName;
    }
    if (document.getElementById('userType')) {
        document.getElementById('userType').textContent = userType === 'aluno' ? 'Aluno' : 'Estudante';
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Logout
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Tem certeza que deseja sair?')) {
                localStorage.removeItem('userData');
                localStorage.removeItem('authToken');
                window.location.href = '/login';
            }
        });
    }

    // Pesquisa
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterProvas);
    }

    // Atualizar
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            loadAvailableExams(userData.id || userData.email);
        });
    }
}

// Manipular erro de autenticação
function handleAuthError() {
    alert('Erro de autenticação. Faça login novamente.');
    localStorage.removeItem('userData');
    localStorage.removeItem('authToken');
    window.location.href = '/login';
}

// Variável para armazenar todas as provas
let allProvas = [];

// Carregar provas disponíveis
async function loadAvailableExams(studentId) {
    console.log('Carregando provas para aluno:', studentId);
    
    try {
        showLoading('Carregando provas disponíveis...');
        const provas = await serverService.getAvailableExams();
        allProvas = provas;
        displayProvas(provas);
    } catch (error) {
        console.error('Erro:', error);
        showError('Erro ao carregar provas. Tente novamente.');
    } finally {
        hideLoading();
    }
}

// Exibir provas na interface
function displayProvas(provas) {
    const provasContainer = document.getElementById('provasContainer');
    if (!provasContainer) return;
    
    if (!provas || provas.length === 0) {
        provasContainer.innerHTML = createNoResultsHTML();
        return;
    }
    
    provasContainer.innerHTML = provas.map(createProvaCardHTML).join('');
    setupProvaCardEventListeners();
}

// HTML para quando não há resultados
function createNoResultsHTML() {
    return `
        <div class="no-results">
            <i class="fas fa-inbox"></i>
            <p>Nenhuma prova disponível no momento.</p>
            <p class="small">Entre em contato com seu professor.</p>
            <button onclick="location.reload()">
                <i class="fas fa-sync-alt"></i> Atualizar
            </button>
        </div>
    `;
}

// Criar HTML do card da prova
function createProvaCardHTML(prova) {
    const dataFormatada = formatDate(prova.date || prova.data_limite);
    const duracao = prova.duration || prova.duracao || 'N/A';
    const questoes = prova.questions ? prova.questions.length : (prova.total_questoes || 0);
    const estaDisponivel = isProvaAvailable(prova);
    
    return `
        <div class="prova-card ${!estaDisponivel ? 'expirada' : ''}">
            <div class="prova-header">
                <h3 class="prova-titulo">${prova.title || prova.titulo || 'Prova Sem Título'}</h3>
                ${!estaDisponivel ? '<span class="badge-expirada">Expirada</span>' : ''}
            </div>
            <p class="prova-descricao">${prova.description || prova.descricao || 'Sem descrição'}</p>
            <div class="prova-info">
                <span class="prova-data"><i class="far fa-calendar-alt"></i> ${dataFormatada}</span>
                <span class="prova-duracao"><i class="far fa-clock"></i> ${duracao} min</span>
                <span class="prova-questoes"><i class="far fa-question-circle"></i> ${questoes} questões</span>
                <span class="prova-disciplina"><i class="fas fa-book"></i> ${prova.disciplina || 'Geral'}</span>
            </div>
            <div class="prova-actions">
                <button class="btn-realizar ${!estaDisponivel ? 'btn-disabled' : ''}" 
                        data-prova-id="${prova.id || prova._id}"
                        ${!estaDisponivel ? 'disabled title="Prazo expirado"' : ''}>
                    ${estaDisponivel ? 'Realizar Prova' : 'Prazo Expirado'}
                </button>
                ${prova.nota !== undefined ? `
                    <span class="prova-nota">
                        <i class="fas fa-star"></i> Nota: ${prova.nota.toFixed(1)}
                    </span>
                ` : ''}
            </div>
        </div>
    `;
}

// Verificar se prova está disponível
function isProvaAvailable(prova) {
    const dataLimite = new Date(prova.date || prova.data_limite);
    return new Date() <= dataLimite;
}

// Configurar event listeners dos cards de prova
function setupProvaCardEventListeners() {
    document.querySelectorAll('.btn-realizar:not(.btn-disabled)').forEach(button => {
        button.addEventListener('click', function() {
            const provaId = this.getAttribute('data-prova-id');
            realizarProva(provaId);
        });
    });
}

// Filtrar provas
function filterProvas() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    if (!searchTerm) {
        displayProvas(allProvas);
        return;
    }
    
    const filteredProvas = allProvas.filter(prova => 
        (prova.title || '').toLowerCase().includes(searchTerm) ||
        (prova.description || '').toLowerCase().includes(searchTerm) ||
        (prova.disciplina || '').toLowerCase().includes(searchTerm)
    );
    
    displayProvas(filteredProvas);
}

// Formatador de data
function formatDate(dateString) {
    if (!dateString) return 'Data não definida';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Data inválida';
        
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return String(dateString);
    }
}

// Iniciar prova
async function realizarProva(provaId) {
    console.log('Iniciando prova:', provaId);
    
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const authToken = localStorage.getItem('authToken');
    
    if (!userData.email || !authToken) {
        alert('Erro de autenticação. Faça login novamente.');
        window.location.href = '/login';
        return;
    }
    
    try {
        const attemptCheck = await serverService.checkExamAttempt(provaId, userData.email);
        
        if (attemptCheck.attempted) {
            if (confirm('Você já realizou esta prova. Deseja ver o resultado?')) {
                alert('Visualização de resultados em desenvolvimento.');
            }
        } else {
            window.location.href = `/prova/${provaId}?token=${encodeURIComponent(authToken)}`;
        }
    } catch (error) {
        console.error('Erro:', error);
        window.location.href = `/prova/${provaId}?token=${encodeURIComponent(authToken)}`;
    }
}

// Mostrar loading
function showLoading(message) {
    hideLoading();
    
    const loading = document.createElement('div');
    loading.id = 'loadingOverlay';
    loading.innerHTML = `
        <div style="text-align: center; padding: 30px; background: white; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15);">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
    
    Object.assign(loading.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        background: 'rgba(255,255,255,0.95)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '10000'
    });
    
    document.body.appendChild(loading);
}

// Esconder loading
function hideLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) loading.remove();
}

// Mostrar erro
function showError(message) {
    const provasContainer = document.getElementById('provasContainer');
    if (provasContainer) {
        provasContainer.innerHTML = `
            <div class="error-container">
                <i class="fas fa-exclamation-triangle"></i>
                <p>${message}</p>
                <button onclick="location.reload()">
                    <i class="fas fa-sync-alt"></i> Tentar Novamente
                </button>
            </div>
        `;
    }
}

// Adicionar estilos CSS
function addStyles() {
    if (document.querySelector('#aluno-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'aluno-styles';
    styles.textContent = `
        .prova-card {
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            padding: 20px;
            margin: 15px 0;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
        }
        
        .prova-card:hover {
            box-shadow: 0 4px 16px rgba(0,0,0,0.15);
            transform: translateY(-2px);
        }
        
        .prova-card.expirada {
            opacity: 0.6;
            background-color: #f8f9fa;
        }
        
        .prova-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
            gap: 10px;
        }
        
        .prova-titulo {
            margin: 0;
            color: #2c3e50;
            font-size: 18px;
            font-weight: 600;
        }
        
        .badge-expirada {
            background: #e74c3c;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .prova-descricao {
            color: #666;
            margin-bottom: 15px;
            line-height: 1.4;
        }
        
        .prova-info {
            display: flex;
            gap: 15px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }
        
        .prova-info span {
            display: flex;
            align-items: center;
            gap: 5px;
            color: #7f8c8d;
            font-size: 14px;
        }
        
        .prova-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
        }
        
        .btn-realizar {
            background: #3498db;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        
        .btn-realizar:hover {
            background: #2980b9;
            transform: translateY(-1px);
        }
        
        .btn-disabled {
            background: #bdc3c7 !important;
            cursor: not-allowed !important;
        }
        
        .prova-nota {
            background: #27ae60;
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .no-results, .error-container {
            text-align: center;
            padding: 40px 20px;
            color: #666;
        }
        
        .no-results i, .error-container i {
            font-size: 3em;
            color: #ccc;
            margin-bottom: 15px;
        }
        
        .error-container i {
            color: #e74c3c;
        }
        
        .no-results button, .error-container button {
            background: #3498db;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-top: 15px;
        }
        
        .search-input {
            width: 100%;
            max-width: 400px;
            padding: 10px 15px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 16px;
        }
        
        .search-input:focus {
            outline: none;
            border-color: #3498db;
        }
        
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3498db;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
            .prova-info {
                flex-direction: column;
                gap: 8px;
            }
            
            .prova-actions {
                flex-direction: column;
                align-items: stretch;
            }
            
            .prova-header {
                flex-direction: column;
            }
            
            .prova-card {
                padding: 15px;
            }
        }
    `;
    
    document.head.appendChild(styles);
}

// Inicializar estilos
addStyles();

// Função global para recarregar
window.recarregarProvas = function() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    loadAvailableExams(userData.id || userData.email);
};

console.log('aluno.js inicializado com sucesso');