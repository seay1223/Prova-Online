// Código de logout atualizado e corrigido
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.querySelector(".logout-btn");
    
    if (logoutBtn && !logoutBtn.hasAttribute('data-listener-added')) {
        logoutBtn.setAttribute('data-listener-added', 'true');
        
        logoutBtn.addEventListener("click", function(e) {
            e.preventDefault();
            
            if (confirm("Tem certeza que deseja sair?")) {
                // Limpa todos os dados de autenticação
                localStorage.removeItem('usuarioLogado');
                localStorage.removeItem('userData');
                sessionStorage.removeItem('usuarioLogado');
                
                // SEMPRE redireciona para /login (que EXISTE e FUNCIONA)
                window.location.href = '/login';
            }
        });
    }
});