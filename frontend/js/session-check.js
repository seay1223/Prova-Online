document.addEventListener('DOMContentLoaded', function() {
    console.log('=== VERIFICAÇÃO DE SESSÃO INICIADA ===');

    const noCheckPages = [
        '/login/',
        '/login',
        '/cadastro/',
        '/cadastro',
        '/contato/',
        '/politica/',
        '/termos/',
        '/',
        ''
    ];

    const currentPath = window.location.pathname;

    if (noCheckPages.includes(currentPath) || noCheckPages.includes(currentPath + '/')) {
        console.log('⏭️ Página excluída da verificação:', currentPath);
        return;
    }

    const publicPages = [
        '/login/',
        '/cadastro/',
        '/contato/',
        '/politica/',
        '/termos/',
        '/',
        ''
    ];

    const isPublicPage = publicPages.some(page => 
        window.location.pathname === page || 
        window.location.pathname.startsWith(page.replace(/\/$/, ''))
    );

    if (isPublicPage) {
        console.log('📄 Página pública, sessão não verificada');
        return;
    }

    console.log('🔐 Verificando autenticação para página protegida...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('⏰ Timeout: Verificação de sessão demorou mais de 5 segundos.');
    }, 5000);

    fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include',
        signal: controller.signal,
        headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
        }
    })
    .then(response => {
        clearTimeout(timeoutId);
        console.log('📡 Resposta recebida da API /api/auth/check:', response.status);

        if (!response.ok) {
            console.warn('⚠️ API retornou erro:', response.status);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    })
    .then(data => {
        console.log('✅ Dados da API /api/auth/check:', data);

        if (data.isAuthenticated && data.user) {
            handleAuthenticated(data.user);
        } else {
            handleNotAuthenticated();
        }
    })
    .catch(error => {
        clearTimeout(timeoutId);
        console.error('❌ Erro CRÍTICO ao verificar sessão:', error);

        if (error.name === 'AbortError') {
            console.warn('⚠️ Verificação de sessão foi abortada (timeout).');
            handleNotAuthenticated();
        } else {
            console.error('Erro na verificação de sessão:', error);
            handleNotAuthenticated();
        }
    });

    function handleAuthenticated(user) {
        console.log('✅ Usuário autenticado via API:', user.nome);

        const currentPath = window.location.pathname;

        if (currentPath.includes('/login')) {
            console.log('📋 Usuário autenticado na página de login, redirecionando...');
            const redirectUrl = user.tipo === 'professor' ? '/professor/professor.html' : '/aluno/aluno.html';
            
            if (currentPath !== redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                console.log('⚠️ Já está na página destino, evitando redirecionamento');
            }
            return;
        }

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
        console.log('❌ Usuário NÃO autenticado via API.');

        if (window.location.pathname.includes('/login')) {
            console.log('ℹ️ Já está na página de login, não redirecionar.');
            return;
        }

        // **LÓGICA DE TOLERÂNCIA: Verificar se o login foi bem-sucedido recentemente**
        const lastLogin = sessionStorage.getItem('lastLogin');
        const now = Date.now();
        const FIVE_MINUTES = 5 * 60 * 1000;

        if (lastLogin && (now - parseInt(lastLogin)) < FIVE_MINUTES) {
            console.log('✅ Login recente detectado (dentro de 5 min), ignorando falha de verificação de sessão. Permitindo acesso.');
            return;
        }

        console.log('🔁 Redirecionando para login devido à falha de autenticação.');
        const redirectUrl = '/login/?error=Sessão expirada. Faça login novamente.';
        setTimeout(() => {
            window.location.replace(redirectUrl);
        }, 1000);
    }

    function showAccessDenied(message) {
        const accessDenied = document.createElement('div');
        accessDenied.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: #f44336;
            color: white;
            padding: 20px;
            text-align: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
        `;
        accessDenied.innerHTML = `
            <strong>Acesso Negado:</strong> ${message}
            <br>
            <small>Redirecionando para login em 5 segundos...</small>
        `;
        document.body.appendChild(accessDenied);

        setTimeout(() => {
            window.location.href = '/login/?error=' + encodeURIComponent(message);
        }, 5000);
    }

    function updateUserInterface(user) {
        console.log('👤 Atualizando interface para usuário:', user.nome);
        const userElements = document.querySelectorAll('[data-user]');
        userElements.forEach(el => {
            const prop = el.getAttribute('data-user');
            if (user[prop]) {
                el.textContent = user[prop];
            }
        });
    }
});