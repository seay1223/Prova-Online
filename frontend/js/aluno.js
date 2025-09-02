document.addEventListener('DOMContentLoaded', function() {
    // Verifica se o usuário está logado
    const usuarioLogado = localStorage.getItem('usuarioLogado');

    if (!usuarioLogado) {
        alert('Você precisa estar logado para acessar esta página!');
        window.location.href = '/aluno/login';
        return;
    }

    try {
        const userData = JSON.parse(usuarioLogado);
        // Exibe o e-mail do usuário na tela, se existir
        document.getElementById('userEmail').textContent = userData.email || 'Aluno';
    } catch (e) {
        console.error('Erro ao carregar dados do usuário:', e);
    }

    // Evento de logout
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Tem certeza que deseja sair?')) {
                localStorage.removeItem('usuarioLogado');
                window.location.href = '/aluno/login';
            }
        });
    }

    // Buscar provas do servidor
    fetchProvas();

    // Adicionar evento de pesquisa
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', filterProvas);
});

let allProvas = []; // Armazenar todas as provas para filtragem

async function fetchProvas() {
    try {
        const response = await fetch('/api/exams');
        
        if (!response.ok) {
            throw new Error('Erro ao carregar provas');
        }
        
        const provas = await response.json();
        allProvas = provas;
        displayProvas(provas);
    } catch (error) {
        console.error('Erro:', error);
        document.getElementById('provasContainer').innerHTML = `
            <div class="no-results">
                <i class="fas fa-exclamation-circle"></i>
                <p>Erro ao carregar as provas. Tente novamente mais tarde.</p>
            </div>
        `;
    }
}

function displayProvas(provas) {
    const provasContainer = document.getElementById('provasContainer');
    
    if (provas.length === 0) {
        provasContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-inbox"></i>
                <p>Nenhuma prova disponível no momento.</p>
            </div>
        `;
        return;
    }
    
    provasContainer.innerHTML = provas.map(prova => `
        <div class="prova-card">
            <h3 class="prova-titulo">${prova.titulo || 'Prova Sem Título'}</h3>
            <p class="prova-descricao">${prova.descricao || 'Descrição não disponível'}</p>
            <div class="prova-info">
                <span class="prova-data">
                    <i class="far fa-calendar-alt"></i>
                    ${formatDate(prova.data_criacao)}
                </span>
                <span class="prova-duracao">
                    <i class="far fa-clock"></i>
                    ${prova.duracao || 'N/A'} min
                </span>
            </div>
            <button class="btn-realizar" data-prova-id="${prova.id}">
                Realizar Prova
            </button>
        </div>
    `).join('');
    
    // Adicionar event listeners aos botões
    document.querySelectorAll('.btn-realizar').forEach(button => {
        button.addEventListener('click', function() {
            const provaId = this.getAttribute('data-prova-id');
            realizarProva(provaId);
        });
    });
}

function filterProvas() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filteredProvas = allProvas.filter(prova => {
        return (
            (prova.titulo && prova.titulo.toLowerCase().includes(searchTerm)) ||
            (prova.descricao && prova.descricao.toLowerCase().includes(searchTerm))
        );
    });
    displayProvas(filteredProvas);
}

function formatDate(dateString) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
}

function realizarProva(provaId) {
    const usuarioLogado = localStorage.getItem('usuarioLogado');

    if (!usuarioLogado) {
        alert('Você precisa estar logado para realizar uma prova!');
        window.location.href = '/aluno/login';
        return;
    }

    try {
        const userData = JSON.parse(usuarioLogado);
        const token = userData.linkUnico || '';
        
        if (!token) {
            alert('Token inválido. Faça login novamente.');
            window.location.href = '/aluno/login';
            return;
        }
        
        // Primeiro verificar se a prova existe e está disponível
        fetch(`/api/prova/${provaId}?token=${encodeURIComponent(token)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Prova não disponível');
                }
                return response.json();
            })
            .then(prova => {
                // Redireciona para a página da prova com o token e ID
                window.location.href = `/prova/${provaId}?token=${encodeURIComponent(token)}`;
            })
            .catch(error => {
                console.error('Erro ao verificar prova:', error);
                alert('Esta prova não está disponível no momento.');
            });
    } catch (e) {
        console.error('Erro ao carregar dados do usuário:', e);
        alert('Erro ao processar usuário. Faça login novamente.');
        window.location.href = '/aluno/login';
    }
}