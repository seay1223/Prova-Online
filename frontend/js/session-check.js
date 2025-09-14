document.addEventListener('DOMContentLoaded', function() {
    console.log('=== VERIFICAÇÃO DE SESSÃO INICIADA ===');
    console.log('Página atual:', window.location.pathname);
    
    // Não verificar sessão nas páginas públicas
    const publicPages = ['/login/', '/cadastro/', '/contato/', '/politica/', '/termos/'];
    
    // Verificar se estamos em uma página pública
    const isPublicPage = publicPages.some(page => 
        window.location.pathname.startsWith(page.replace(/\/$/, ''))
    );
    
    if (isPublicPage) {
        console.log('Página pública, sessão não verificada');
        return;
    }
    
    console.log('Verificando autenticação...');
    
    // Adicionar timeout para a requisição
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos
    
    fetch('/api/auth/check', {
        credentials: 'include', // IMPORTANTE: inclui cookies na requisição
        signal: controller.signal
    })
    .then(response => {
        clearTimeout(timeoutId);
        console.log('Status da verificação:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
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
        clearTimeout(timeoutId);
        console.error('❌ Erro ao verificar sessão:', error);
        
        // Só redirecionar se não estiver em página pública
        if (!isPublicPage && window.location.pathname !== '/login/') {
            if (error.name === 'AbortError') {
                window.location.href = '/login/?error=Tempo de verificação excedido';
            } else {
                window.location.href = '/login/?error=Erro de conexão com o servidor';
            }
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
        
        // Disparar evento personalizado para notificar outros scripts
        document.dispatchEvent(new CustomEvent('userAuthenticated', {
            detail: { user }
        }));
    }
});

// Função de debug temporária - adicione no final do session-check.js
function debugSession() {
    console.log('=== DEBUG DE SESSÃO ===');
    console.log('Cookie:', document.cookie);
    console.log('LocalStorage:', localStorage);
    console.log('SessionStorage:', sessionStorage);
    
    fetch('/api/debug/session', { credentials: 'include' })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => console.log('Debug da sessão:', data))
        .catch(error => console.error('Erro no debug:', error));
}

// Chame esta função no console do navegador para debug
window.debugSession = debugSession;