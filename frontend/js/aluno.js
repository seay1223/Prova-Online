// Funções para as ações dos botões
function verProvas() {
    alert('Redirecionando para a página de provas...');
    // Se quiser ativar o redirecionamento, pode descomentar:
    // window.location.href = '/provas';
}

function realizarProva() {
    const usuarioLogado = localStorage.getItem('usuarioLogado');

    if (!usuarioLogado) {
        alert('Você precisa estar logado para acessar esta página!');
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
        // Redireciona incluindo o token na query string
        window.location.href = `/provas?token=${encodeURIComponent(token)}`;
    } catch (e) {
        console.error('Erro ao carregar dados do usuário:', e);
        alert('Erro ao processar usuário. Faça login novamente.');
        window.location.href = '/aluno/login';
    }
}

function verNotas() {
    alert('Redirecionando para a página de notas...');
    // Se quiser ativar o redirecionamento, pode descomentar:
    // window.location.href = '/notas';
}

// Código executado ao carregar a página
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
});
