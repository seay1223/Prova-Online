// Funções para as ações dos botões
function verProvas() {
    alert('Redirecionando para a página de provas...');
    // window.location.href = '/provas'; // Implementar quando a rota estiver disponível
}

function realizarProva() {
    alert('Redirecionando para a página de realização de provas...');
    // window.location.href = '/realizar-prova'; // Implementar quando a rota estiver disponível
}

function verNotas() {
    alert('Redirecionando para a página de notas...');
    // window.location.href = '/notas'; // Implementar quando a rota estiver disponível
}

// Carregar informações do usuário
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se o usuário está logado
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    
    if (!usuarioLogado) {
        alert('Você precisa estar logado para acessar esta página!');
        window.location.href = '/aluno/login';
        return;
    }
    
    try {
        const userData = JSON.parse(usuarioLogado);
        document.getElementById('userEmail').textContent = userData.email || 'Aluno';
    } catch (e) {
        console.error('Erro ao carregar dados do usuário:', e);
    }
    
    // Adicionar evento de logout
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Tem certeza que deseja sair?')) {
                localStorage.removeItem('usuarioLogado');
                window.location.href = '/aluno/login';
            }
        });
    }
});