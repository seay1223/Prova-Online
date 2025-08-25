// Código de logout genérico que pode ser usado em várias páginas
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
                
                // Redireciona para a página de login correta
                const currentPath = window.location.pathname;
                let redirectUrl = '/login';
                
                if (currentPath.includes('/aluno')) {
                    redirectUrl = '/aluno/login';
                } else if (currentPath.includes('/professor')) {
                    redirectUrl = '/professor/login';
                }
                
                window.location.href = redirectUrl;
            }
        });
    }
});