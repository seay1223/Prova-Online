// aluno.js - Página do aluno (ATUALIZADO PARA CPF)
console.log('aluno.js carregado - versão com CPF');

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
    checkExamAttempt: async function(examId, studentCpf) {
        try {
            const token = localStorage.getItem('authToken');
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
        loadAvailableExams(user.cpf);

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
    const userName = user.name || user.nome || 'Aluno';
    const userCpf = user.cpf || '';
    const formattedCpf = formatCPF(userCpf);
    
    if (document.getElementById('userName')) {
        document.getElementById('userName').textContent = userName;
    }
    if (document.getElementById('userCpf')) {
        document.getElementById('userCpf').textContent = `CPF: ${formattedCpf}`;
    }
}

// Formatar CPF para exibição
function formatCPF(cpf) {
    if (!cpf || cpf.length !== 11) return cpf;
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
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
            loadAvailableExams(userData.cpf);
        });
    }
}

// Restante do código permanece igual, exceto pela função realizarProva
// que precisa ser atualizada para usar CPF em vez de email

// Iniciar prova
async function realizarProva(provaId) {
    console.log('Iniciando prova:', provaId);
    
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const authToken = localStorage.getItem('authToken');
    
    if (!userData.cpf || !authToken) {
        alert('Erro de autenticação. Faça login novamente.');
        window.location.href = '/login';
        return;
    }
    
    try {
        const attemptCheck = await serverService.checkExamAttempt(provaId, userData.cpf);
        
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

// Função global para recarregar
window.recarregarProvas = function() {
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    loadAvailableExams(userData.cpf);
};

// Restante do código permanece igual...
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