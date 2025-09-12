document.addEventListener('DOMContentLoaded', function() {
    console.log('=== VERIFICAÇÃO DE SESSÃO INICIADA ===');
    console.log('Página atual:', window.location.pathname);
    
    // Não verificar sessão nas páginas públicas
    const publicPages = ['/login/', '/cadastro/', '/contato/', '/politica/', '/termos/'];
    if (publicPages.includes(window.location.pathname)) {
        console.log('Página pública, sessão não verificada');
        return;
    }
    
    console.log('Verificando autenticação...');
    
    fetch('/api/auth/check', {
        credentials: 'include' // IMPORTANTE: inclui cookies na requisição
    })
    .then(response => {
        console.log('Status da verificação:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Resposta da verificação:', data);
        
        if (data.authenticated) {
            console.log('✅ Usuário autenticado:', data.user);
            
            // Verificar se o tipo de usuário corresponde à página
            const isProfessorPage = window.location.pathname.startsWith('/professor');
            const isAlunoPage = window.location.pathname.startsWith('/aluno');
            
            if (isProfessorPage && data.user.tipo !== 'professor') {
                console.log('❌ Acesso negado: professor requerido');
                window.location.href = '/login/?error=Acesso restrito a professores';
                return;
            }
            
            if (isAlunoPage && data.user.tipo !== 'aluno') {
                console.log('❌ Acesso negado: aluno requerido');
                window.location.href = '/login/?error=Acesso restrito a alunos';
                return;
            }
            
            // Atualizar interface com dados do usuário
            updateUserInterface(data.user);
            
        } else {
            console.log('❌ Usuário não autenticado');
            // Não redirecionar se já estiver na página de login
            if (window.location.pathname !== '/login/') {
                window.location.href = '/login/?error=Sessão expirada ou não autenticado';
            }
        }
    })
    .catch(error => {
        console.error('❌ Erro ao verificar sessão:', error);
        // Só redirecionar se não estiver em página pública
        if (!publicPages.includes(window.location.pathname)) {
            window.location.href = '/login/?error=Erro de conexão com o servidor';
        }
    });
    
    function updateUserInterface(user) {
        // Atualizar elementos com dados do usuário
        const userElements = document.querySelectorAll('[data-user]');
        userElements.forEach(el => {
            const prop = el.getAttribute('data-user');
            if (user[prop]) {
                el.textContent = user[prop];
            }
        });
        
        // Mostrar/ocultar elementos baseado no tipo de usuário
        const professorElements = document.querySelectorAll('.professor-only');
        const alunoElements = document.querySelectorAll('.aluno-only');
        
        if (user.tipo === 'professor') {
            professorElements.forEach(el => el.style.display = 'block');
            alunoElements.forEach(el => el.style.display = 'none');
        } else if (user.tipo === 'aluno') {
            professorElements.forEach(el => el.style.display = 'none');
            alunoElements.forEach(el => el.style.display = 'block');
        }
    }
});

// Função de debug temporária - adicione no final do session-check.js
function debugSession() {
    console.log('=== DEBUG DE SESSÃO ===');
    console.log('Cookie:', document.cookie);
    console.log('LocalStorage:', localStorage);
    console.log('SessionStorage:', sessionStorage);
    
    fetch('/api/debug/session', { credentials: 'include' })
        .then(response => response.json())
        .then(data => console.log('Debug da sessão:', data))
        .catch(error => console.error('Erro no debug:', error));
}

// Chame esta função no console do navegador para debug
window.debugSession = debugSession;