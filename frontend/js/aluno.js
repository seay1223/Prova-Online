// aluno.js - Página do aluno (VERSÃO CORRIGIDA)
console.log('aluno.js carregado - versão corrigida');

// Serviço para comunicação com a API
window.serverService = {
    // Buscar dados do usuário
    getUserData: async function() {
        try {
            // Primeiro tenta pegar do localStorage
            const usuarioLogado = localStorage.getItem('usuarioLogado');
            if (usuarioLogado) {
                console.log('Dados do usuário encontrados no localStorage');
                return JSON.parse(usuarioLogado);
            }
            
            // Se não encontrar, tenta pela API
            const token = this.getAuthToken(); // Usar a função getAuthToken
            if (!token) {
                console.log('Nenhum token encontrado');
                return null;
            }
            
            console.log('Buscando dados do usuário via API...');
            const response = await fetch('/api/user/data', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.status === 401) {
                console.log('Token inválido ou expirado');
                this.clearAuthData();
                window.location.href = '/login';
                return null;
            }
            
            if (!response.ok) {
                throw new Error(`Erro HTTP ${response.status} ao buscar dados do usuário`);
            }
            
            const data = await response.json();
            console.log('Dados do usuário recebidos:', data);
            
            // Salvar no localStorage para uso futuro
            localStorage.setItem('usuarioLogado', JSON.stringify(data));
            return data;
            
        } catch (error) {
            console.error('Erro ao buscar dados do usuário:', error);
            return null;
        }
    },
    
    // Função para obter token de autenticação (localStorage ou cookies)
    getAuthToken: function() {
        // Primeiro tenta do localStorage
        const token = localStorage.getItem('authToken');
        if (token) {
            console.log('Token encontrado no localStorage');
            return token;
        }
        
        // Se não encontrar, tenta dos cookies
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'authToken') {
                console.log('Token encontrado nos cookies');
                return value;
            }
        }
        
        console.log('Token não encontrado em localStorage nem cookies');
        return null;
    },
    
    // Limpar dados de autenticação
    clearAuthData: function() {
        localStorage.removeItem('usuarioLogado');
        localStorage.removeItem('userData');
        localStorage.removeItem('authToken');
        document.cookie = 'authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    },
    
    // Buscar provas disponíveis
    getAvailableExams: async function() {
        try {
            const token = this.getAuthToken();
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
                this.clearAuthData();
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
    checkExamAttempt: async function(examId, studentCpf) {
        try {
            const token = this.getAuthToken();
            if (!token) {
                console.log('Nenhum token para verificar tentativa');
                return { attempted: false };
            }
            
            const response = await fetch(`/api/exams/${examId}/attempt/${studentCpf}`, {
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
document.addEventListener('DOMContentLoaded', async function() {
    console.log('=== PÁGINA DO ALUNO ===');
    console.log('Página do aluno carregando...');
    
    // Verificar autenticação de forma mais robusta
    await checkAuthentication();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Adicionar estilos
    addStyles();
});

// Função para verificar autenticação
async function checkAuthentication() {
    console.log('Verificando autenticação...');
    
    // Verificar se temos os dados necessários
    const authToken = serverService.getAuthToken();
    let usuarioLogado = localStorage.getItem('usuarioLogado');
    
    console.log('Token:', authToken ? 'Presente' : 'Ausente');
    console.log('Usuário logado:', usuarioLogado ? 'Presente' : 'Ausente');
    
    // Se não temos token, redirecionar imediatamente
    if (!authToken) {
        console.log('Nenhum token de autenticação encontrado');
        redirectToLogin();
        return;
    }
    
    // Se temos token mas não temos dados do usuário, tentar buscar
    if (!usuarioLogado) {
        console.log('Buscando dados do usuário...');
        showLoading('Carregando dados do usuário...');
        
        const userData = await serverService.getUserData();
        if (!userData) {
            hideLoading();
            redirectToLogin();
            return;
        }
        
        usuarioLogado = JSON.stringify(userData);
        localStorage.setItem('usuarioLogado', usuarioLogado);
        hideLoading();
    }
    
    // Parse dos dados do usuário
    try {
        const user = JSON.parse(usuarioLogado);
        console.log('Usuário autenticado:', user);
        
        // Verificar tipo de usuário
        const userType = user.tipo || user.type || user.role;
        if (userType !== 'aluno' && userType !== 'student') {
            alert('Acesso restrito a alunos.');
            window.location.href = '/dashboard';
            return;
        }
        
        // Verificar se a sessão expirou (8 horas)
        if (isSessionExpired(user.timestamp)) {
            console.log('Sessão expirada');
            serverService.clearAuthData();
            alert('Sua sessão expirou. Por favor, faça login novamente.');
            window.location.href = '/login';
            return;
        }
        
        // Garantir que userData também está salvo para compatibilidade
        localStorage.setItem('userData', JSON.stringify({
            id: user.id || user.cpf,
            nome: user.nome || user.name,
            cpf: user.cpf,
            tipo: user.tipo || user.type,
            turma: user.turma || user.class,
            timestamp: user.timestamp || new Date().getTime()
        }));
        
        // Exibir informações do usuário
        updateUserInfo(user);
        
        // Carregar provas disponíveis
        loadAvailableExams(user.cpf);
        
    } catch (e) {
        console.error('Erro ao processar dados do usuário:', e);
        redirectToLogin();
    }
}

// Função para verificar se a sessão expirou
function isSessionExpired(timestamp) {
    if (!timestamp) return true;
    const now = new Date().getTime();
    const sessionDuration = 8 * 60 * 60 * 1000; // 8 horas em milissegundos
    return (now - timestamp) > sessionDuration;
}

// Redirecionar para login
function redirectToLogin() {
    console.log('Redirecionando para login...');
    alert('Você precisa estar logado para acessar esta página!');
    serverService.clearAuthData();
    window.location.href = '/login';
}

// Atualizar informações do usuário na interface
function updateUserInfo(user) {
    // CORREÇÃO: Buscar nome de diferentes campos possíveis
    const userName = user.nome || user.name || 'Aluno';
    const userCpf = user.cpf || '';
    const userTurma = user.turma || user.class || '';
    const formattedCpf = formatCPF(userCpf);
    
    // Verificar múltiplos IDs possíveis
    const nameElement = document.getElementById('userName') || 
                       document.getElementById('nomeAluno') || 
                       document.querySelector('.user-name');
                       
    const cpfElement = document.getElementById('userCpf') || 
                      document.querySelector('.user-cpf');
                      
    const turmaElement = document.getElementById('turmaAluno') || 
                        document.querySelector('.user-turma');
    
    if (nameElement) {
        nameElement.textContent = userName;
    } else {
        console.warn('Elemento para exibir nome do usuário não encontrado');
    }
    
    if (cpfElement) {
        cpfElement.textContent = `CPF: ${formattedCpf}`;
    }
    
    if (turmaElement) {
        turmaElement.textContent = userTurma;
    }
}

// Formatar CPF para exibição
function formatCPF(cpf) {
    if (!cpf || cpf.length !== 11) return cpf;
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Configurar event listeners
function setupEventListeners() {
    // Logout - Verificar múltiplos seletores possíveis
    const logoutBtn = document.querySelector('.logout-btn') || 
                     document.getElementById('btnLogout') || 
                     document.querySelector('[data-logout]');
                     
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Tem certeza que deseja sair?')) {
                serverService.clearAuthData();
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
        refreshBtn.addEventListener('click', function() {
            const userData = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
            loadAvailableExams(userData.cpf);
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
    const dataFim = new Date(prova.dataFim || prova.endDate);
    const expirada = agora > dataFim;
    
    if (expirada) {
        card.classList.add('expirada');
    }
    
    // Formatar datas para exibição
    const dataInicioFormatada = formatDate(prova.dataInicio || prova.startDate);
    const dataFimFormatada = formatDate(prova.dataFim || prova.endDate);
    
    card.innerHTML = `
        <div class="prova-header">
            <h3 class="prova-titulo">${prova.titulo || prova.title}</h3>
            ${expirada ? '<span class="badge-expirada">Expirada</span>' : ''}
        </div>
        
        <p class="prova-descricao">${prova.descricao || prova.description || 'Sem descrição'}</p>
        
        <div class="prova-info">
            <span><i class="fas fa-clock"></i> ${prova.duracao || prova.duration} minutos</span>
            <span><i class="fas fa-calendar"></i> Início: ${dataInicioFormatada}</span>
            <span><i class="fas fa-calendar-times"></i> Fim: ${dataFimFormatada}</span>
        </div>
        
        <div class="prova-actions">
            ${expirada ? 
                '<button class="btn-realizar btn-disabled" disabled>Prova Expirada</button>' : 
                '<button class="btn-realizar" onclick="realizarProva(\'' + prova.id + '\')">Realizar Prova</button>'
            }
        </div>
    `;
    
    return card;
}

// Iniciar prova
async function realizarProva(provaId) {
    console.log('Iniciando prova:', provaId);
    
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
    const authToken = serverService.getAuthToken();
    
    if (!usuarioLogado.cpf || !authToken) {
        alert('Erro de autenticação. Faça login novamente.');
        window.location.href = '/login';
        return;
    }
    
    try {
        const attemptCheck = await serverService.checkExamAttempt(provaId, usuarioLogado.cpf);
        
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

// Funções auxiliares
function formatDate(dateString) {
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

// Função global para recarregar
window.recarregarProvas = function() {
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
    loadAvailableExams(usuarioLogado.cpf);
};

console.log('aluno.js inicializado com sucesso');