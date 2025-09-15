console.log('aluno.js carregado - versão corrigida para sessões');

// Serviço para comunicação com a API (adaptado para sessões)
window.serverService = {
    // Buscar dados do usuário ATUAL da sessão
    getUserData: async function() {
        try {
            console.log('Buscando dados do usuário via /api/auth/check...');
            const response = await fetch('/api/auth/check', {
                credentials: 'include', // IMPORTANTE: enviar cookies de sessão
                headers: { 'Accept': 'application/json' }
            });
            
            if (!response.ok) {
                console.log('Usuário não autenticado ou sessão inválida');
                return null;
            }
            
            const data = await response.json();
            console.log('Dados do usuário recebidos:', data);
            
            if (data.isAuthenticated && data.user) {
                return data.user; // Retorna o objeto 'user' diretamente
            }
            
            return null;
        } catch (error) {
            console.error('Erro ao buscar dados do usuário:', error);
            return null;
        }
    },
    
    // Buscar provas disponíveis (sem token, a API usa a sessão)
    getAvailableExams: async function() {
        try {
            console.log('Buscando provas disponíveis...');
            const response = await fetch('/api/exams', {
                credentials: 'include', // Enviar cookies
                headers: { 'Accept': 'application/json' }
            });
            
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
    checkExamAttempt: async function(examId, studentCpf) {
        try {
            const response = await fetch(`/api/exams/${examId}/attempt/${studentCpf}`, {
                credentials: 'include' // Enviar cookies
            });
            
            if (response.ok) {
                return await response.json();
            }
            return { attempted: false };
        } catch (error) {
            console.error('Erro ao verificar tentativa:', error);
            return { attempted: false };
        }
    },
    
    // Limpar dados de autenticação (destruir sessão)
    clearAuthData: async function() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    }
};

// Função principal quando o documento carrega
document.addEventListener('DOMContentLoaded', async function() {
    console.log('=== PÁGINA DO ALUNO ===');
    console.log('Página do aluno carregando...');
    
    await checkAuthentication();
    setupEventListeners();
    addStyles();
});

// Função para verificar autenticação
async function checkAuthentication() {
    console.log('Verificando autenticação via sessão...');
    showLoading('Verificando autenticação...');
    
    const user = await serverService.getUserData();
    
    hideLoading();
    
    if (!user) {
        console.log('Falha na autenticação. Redirecionando para login.');
        redirectToLogin();
        return;
    }
    
    // Verificar tipo de usuário
    if (user.tipo !== 'aluno') {
        alert('Acesso restrito a alunos.');
        window.location.href = '/dashboard.html';
        return;
    }
    
    // Atualizar interface com dados do usuário
    updateUserInfo(user);
    
    // Carregar provas disponíveis
    loadAvailableExams(user.cpf);
}

// Redirecionar para login
function redirectToLogin() {
    alert('Você precisa estar logado como aluno para acessar esta página!');
    window.location.href = '/login';
}

// Atualizar informações do usuário na interface
function updateUserInfo(user) {
    const userName = user.nome || 'Aluno';
    const userCpf = user.cpf || '';
    const userTurma = user.turma || '';
    const formattedCpf = formatCPF(userCpf);
    
    // Atualizar elementos da UI
    const nameElement = document.getElementById('userName') || 
                       document.getElementById('nomeAluno') || 
                       document.querySelector('.user-name');
                       
    const cpfElement = document.getElementById('userCpf') || 
                      document.querySelector('.user-cpf');
                      
    const turmaElement = document.getElementById('turmaAluno') || 
                        document.querySelector('.user-turma');
    
    if (nameElement) nameElement.textContent = userName;
    if (cpfElement) cpfElement.textContent = `CPF: ${formattedCpf}`;
    if (turmaElement) turmaElement.textContent = userTurma;
}

// Formatar CPF para exibição
function formatCPF(cpf) {
    if (!cpf || cpf.length !== 11) return cpf;
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Configurar event listeners
function setupEventListeners() {
    // Logout
    const logoutBtn = document.querySelector('.logout-btn') || 
                     document.getElementById('btnLogout') || 
                     document.querySelector('[data-logout]');
                     
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function() {
            if (confirm('Tem certeza que deseja sair?')) {
                await serverService.clearAuthData();
                window.location.href = '/login';
            }
        });
    } else {
        console.warn('Botão de logout não encontrado');
    }
    
    // Pesquisa
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', filterProvas);
    }
    
    // Atualizar
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            const user = await serverService.getUserData();
            if (user && user.cpf) {
                loadAvailableExams(user.cpf);
            }
        });
    }
}

// Carregar provas disponíveis
async function loadAvailableExams(studentCpf) {
    console.log('Carregando provas para o aluno:', studentCpf);
    showLoading('Carregando provas disponíveis...');
    
    try {
        const provas = await serverService.getAvailableExams();
        hideLoading();
        
        if (provas.length === 0) {
            showNoExamsMessage();
            return;
        }
        
        renderProvas(provas, studentCpf);
    } catch (error) {
        console.error('Erro ao carregar provas:', error);
        hideLoading();
        showError('Erro ao carregar provas. Tente novamente.');
    }
}

// Renderizar lista de provas
function renderProvas(provas, studentCpf) {
    const provasContainer = document.getElementById('provasContainer');
    if (!provasContainer) {
        console.warn('Container de provas não encontrado');
        return;
    }
    
    provasContainer.innerHTML = '';
    
    provas.forEach(prova => {
        const provaElement = createProvaElement(prova, studentCpf);
        provasContainer.appendChild(provaElement);
    });
}

// Criar elemento de prova
function createProvaElement(prova, studentCpf) {
    const card = document.createElement('div');
    card.className = 'prova-card';
    
    // Verificar se a prova expirou
    const agora = new Date();
    const dataFim = new Date(prova.data_limite || prova.dataFim || prova.endDate);
    const expirada = agora > dataFim;
    
    if (expirada) {
        card.classList.add('expirada');
    }
    
    // Formatar datas
    const dataCriacaoFormatada = formatDate(prova.data_criacao || prova.dataInicio || prova.startDate);
    const dataFimFormatada = formatDate(prova.data_limite || prova.dataFim || prova.endDate);
    
    card.innerHTML = `
        <div class="prova-header">
            <h3 class="prova-titulo">${prova.titulo || prova.title}</h3>
            ${expirada ? '<span class="badge-expirada">Expirada</span>' : ''}
        </div>
        
        <p class="prova-descricao">${prova.descricao || prova.description || 'Sem descrição'}</p>
        
        <div class="prova-info">
            <span><i class="fas fa-clock"></i> ${prova.tempo_limite || prova.duracao || prova.duration || 'N/A'} min</span>
            <span><i class="fas fa-calendar"></i> Criada: ${dataCriacaoFormatada}</span>
            <span><i class="fas fa-calendar-times"></i> Fim: ${dataFimFormatada}</span>
        </div>
        
        <div class="prova-actions">
            ${expirada ? 
                '<button class="btn-realizar btn-disabled" disabled>Prova Expirada</button>' : 
                '<button class="btn-realizar" onclick="realizarProva(\'' + prova.id + '\', \'' + studentCpf + '\')">Realizar Prova</button>'
            }
        </div>
    `;
    
    return card;
}

// Iniciar prova
async function realizarProva(provaId, studentCpf) {
    console.log('Iniciando prova:', provaId, 'para aluno:', studentCpf);
    
    try {
        const attemptCheck = await serverService.checkExamAttempt(provaId, studentCpf);
        
        if (attemptCheck.attempted) {
            if (confirm('Você já realizou esta prova. Deseja ver o resultado?')) {
                alert('Visualização de resultados em desenvolvimento.');
            }
        } else {
            // Gera um link único ou redireciona diretamente
            window.location.href = `/prova/${provaId}?aluno=${encodeURIComponent(studentCpf)}`;
        }
    } catch (error) {
        console.error('Erro ao verificar tentativa:', error);
        window.location.href = `/prova/${provaId}?aluno=${encodeURIComponent(studentCpf)}`;
    }
}

// Funções auxiliares
function formatDate(dateString) {
    if (!dateString) return 'Data não disponível';
    const options = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return new Date(dateString).toLocaleString('pt-BR', options);
}

function filterProvas() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.toLowerCase();
    const provas = document.querySelectorAll('.prova-card');
    
    provas.forEach(prova => {
        const titulo = prova.querySelector('.prova-titulo').textContent.toLowerCase();
        const descricao = prova.querySelector('.prova-descricao').textContent.toLowerCase();
        
        if (titulo.includes(searchTerm) || descricao.includes(searchTerm)) {
            prova.style.display = 'block';
        } else {
            prova.style.display = 'none';
        }
    });
}

function showNoExamsMessage() {
    const provasContainer = document.getElementById('provasContainer');
    if (provasContainer) {
        provasContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-clipboard-list"></i>
                <p>Nenhuma prova disponível no momento.</p>
                <button onclick="recarregarProvas()">
                    <i class="fas fa-sync-alt"></i> Recarregar
                </button>
            </div>
        `;
    }
}

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

function hideLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) loading.remove();
}

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

// Função global para recarregar
window.recarregarProvas = async function() {
    const user = await serverService.getUserData();
    if (user && user.cpf) {
        loadAvailableExams(user.cpf);
    }
};

console.log('aluno.js inicializado com sucesso');