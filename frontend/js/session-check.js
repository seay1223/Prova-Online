// === session-check.js COMPLETO E CORRIGIDO ===
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== VERIFICAÇÃO DE SESSÃO INICIADA ===');

    const currentPath = window.location.pathname;

    // Páginas que NÃO devem ser verificadas
    const noCheckPages = [
        '/login',
        '/login/',
        '/cadastro',
        '/cadastro/',
        '/contato',
        '/politica',
        '/termos',
        '/',
        '',
        // Exceções para URLs únicas (aluno/professor por ID)
        ...currentPath.match(/^\/aluno\/[a-f0-9-]+$/) ? [currentPath] : [],
        ...currentPath.match(/^\/professor\/[a-f0-9-]+$/) ? [currentPath] : []
    ];

    const isExcluded = noCheckPages.some(page => {
        return currentPath === page || currentPath === page + '/';
    });

    if (isExcluded) {
        console.log('⏭️ Página excluída da verificação:', currentPath);
        return;
    }

    console.log('🔐 Verificando autenticação para página protegida...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
        headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
    })
    .then(response => {
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    })
    .then(data => {
        if (data.isAuthenticated && data.user) {
            handleAuthenticated(data.user);
        } else {
            handleNotAuthenticated();
        }
    })
    .catch(error => {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            console.warn('⚠️ Verificação de sessão expirou (5s).');
        }
        handleNotAuthenticated();
    });

    function handleAuthenticated(user) {
        const isProfessorPage = currentPath.includes('/professor');
        const isAlunoPage = currentPath.includes('/aluno');

        if (isProfessorPage && user.tipo !== 'professor') {
            showAccessDenied('Acesso restrito a professores');
            return;
        }
        if (isAlunoPage && user.tipo !== 'aluno') {
            showAccessDenied('Acesso restrito a alunos');
            return;
        }
        updateUserInterface(user);
    }

    function handleNotAuthenticated() {
        if (window.location.pathname.includes('/login')) return;

        const lastLogin = sessionStorage.getItem('lastLogin');
        const now = Date.now();
        const FIVE_MINUTES = 5 * 60 * 1000;

        if (lastLogin && (now - parseInt(lastLogin)) < FIVE_MINUTES) {
            console.log('✅ Login recente detectado. Permitindo acesso temporário.');
            return;
        }

        console.log('🔁 Redirecionando para login...');
        const redirectUrl = '/login/?error=Sessão expirada. Faça login novamente.';
        setTimeout(() => window.location.replace(redirectUrl), 1000);
    }

    function showAccessDenied(message) {
        const accessDenied = document.createElement('div');
        accessDenied.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%;
            background: #f44336; color: white; padding: 20px; text-align: center;
            z-index: 10000; font-family: Arial, sans-serif;
        `;
        accessDenied.innerHTML = `<strong>Acesso Negado:</strong> ${message}<br><small>Redirecionando em 5s...</small>`;
        document.body.appendChild(accessDenied);
        setTimeout(() => window.location.href = '/login/?error=' + encodeURIComponent(message), 5000);
    }

    function updateUserInterface(user) {
        document.querySelectorAll('[data-user]').forEach(el => {
            const prop = el.getAttribute('data-user');
            if (user[prop]) el.textContent = user[prop];
        });
    }
});