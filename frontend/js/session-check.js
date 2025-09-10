document.addEventListener('DOMContentLoaded', function() {
    console.log('Verificando sessão do professor...');
    
    fetch('/api/auth/check')
        .then(response => response.json())
        .then(data => {
            if (!data.authenticated || data.user.tipo !== 'professor') {
                console.log('Usuário não autenticado como professor, redirecionando...');
                window.location.href = '/login/?error=Acesso restrito a professores';
            } else {
                console.log('Professor autenticado:', data.user);
            }
        })
        .catch(error => {
            console.error('Erro ao verificar sessão:', error);
            window.location.href = '/login/?error=Erro de autenticação';
        });
});