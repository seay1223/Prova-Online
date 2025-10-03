document.addEventListener('DOMContentLoaded', function() {
    console.log('=== VERIFICAÇÃO DE SESSÃO INICIADA ===');

    // Verificar se a verificação está desativada globalmente
    if (window.disableSessionCheck) {
        console.log('⏭️ Verificação de sessão desativada globalmente');
        return;
    }

    const currentPath = window.location.pathname;

    // Páginas que NÃO devem ser verificadas (públicas)
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
        '/url', // Página intermediária pós-login
    ];

    // Verificar se é URL única de aluno ou professor
    const isUniqueUrl = 
        currentPath.match(/^\/aluno\/[a-f0-9-]{36,}$/) ||
        currentPath.match(/^\/professor\/[a-f0-9-]{36,}$/);

    // Se for URL única, também não verifica aqui
    if (isUniqueUrl) {
        console.log('⏭️ Página de URL única excluída da verificação:', currentPath);
        return;
    }

    const isExcluded = noCheckPages.some(page => {
        const normalizedPage = page.endsWith('/') ? page : page + '/';
        const normalizedPath = currentPath.endsWith('/') ? currentPath : currentPath + '/';
        return normalizedPath === normalizedPage || currentPath === page;
    });

    if (isExcluded) {
        console.log('⏭️ Página pública excluída da verificação:', currentPath);
        return;
    }

    console.log('🔐 Verificando autenticação para página protegida:', currentPath);

    // Verificar primeiro no sessionStorage para evitar requisições desnecessárias
    const userData = sessionStorage.getItem('userData');
    const loginTime = sessionStorage.getItem('loginTime');
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;

    if (userData && loginTime && (now - parseInt(loginTime)) < FIVE_MINUTES) {
        console.log('✅ Login recente detectado no sessionStorage. Permitindo acesso.');
        const user = JSON.parse(userData);
        handleAuthenticated(user);
        return;
    }

    // Se não tem dados recentes, verificar com o servidor
    checkServerSession();
});

function checkServerSession() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    fetch('/api/auth/check', {
        method: 'GET',
        credentials: 'include', // IMPORTANTE: envia cookies
        signal: controller.signal,
        headers: { 
            'Accept': 'application/json', 
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }
    })
    .then(response => {
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            console.log(`❌ Erro HTTP ${response.status} na verificação de sessão`);
            throw new Error(`HTTP ${response.status}`);
        }
        
        return response.json();
    })
    .then(data => {
        console.log('📊 Resposta da verificação de sessão:', data);
        
        if (data.success === false) {
            console.log('❌ API retornou success: false');
            handleNotAuthenticated();
            return;
        }
        
        if (data.isAuthenticated && data.user) {
            console.log('✅ Usuário autenticado:', data.user);
            
            // Atualizar sessionStorage
            sessionStorage.setItem('userData', JSON.stringify(data.user));
            sessionStorage.setItem('loginTime', Date.now().toString());
            
            handleAuthenticated(data.user);
        } else {
            console.log('❌ Usuário não autenticado');
            handleNotAuthenticated();
        }
    })
    .catch(error => {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            console.warn('⚠️ Verificação de sessão expirou (8s). Continuando...');
            return;
        }
        
        console.error('❌ Erro na verificação de sessão:', error);
        handleNotAuthenticated();
    });
}

function handleAuthenticated(user) {
    const currentPath = window.location.pathname;
    
    console.log('👤 Usuário autenticado:', user);
    
    // Verificar se o usuário tem acesso à página atual
    const isProfessorPage = /^\/professor(\/|$)/.test(currentPath);
    const isAlunoPage = /^\/aluno(\/|$)/.test(currentPath);

    if (isProfessorPage && user.tipo !== 'professor') {
        console.log('❌ Aluno tentando acessar área do professor');
        showAccessDenied('Acesso restrito a professores');
        return;
    }
    
    if (isAlunoPage && user.tipo !== 'aluno') {
        console.log('❌ Professor tentando acessar área do aluno');
        showAccessDenied('Acesso restrito a alunos');
        return;
    }
    
    // Atualizar interface do usuário
    updateUserInterface(user);
    
    console.log('✅ Acesso permitido à página:', currentPath);
}

function handleNotAuthenticated() {
    const currentPath = window.location.pathname;
    
    console.log('🔐 Usuário não autenticado');
    
    // Não redirecionar se já está na página de login
    if (currentPath.includes('/login')) {
        console.log('⏭️ Já está na página de login, não redirecionar');
        return;
    }

    console.log('🔁 Redirecionando para login...');
    
    // Criar URL de redirecionamento
    const redirectParams = new URLSearchParams();
    redirectParams.append('redirect', currentPath);
    redirectParams.append('error', 'Sessão expirada. Faça login novamente.');
    
    const redirectUrl = `/login/?${redirectParams.toString()}`;
    
    console.log('🎯 Redirecionando para:', redirectUrl);
    
    // Pequeno delay para evitar loop de redirecionamento
    setTimeout(() => {
        window.location.replace(redirectUrl);
    }, 1000);
}

function showAccessDenied(message) {
    console.log('🚫 Acesso negado:', message);
    
    // Criar overlay de acesso negado
    const accessDenied = document.createElement('div');
    accessDenied.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 20px;
    `;
    
    accessDenied.innerHTML = `
        <div style="background: #f44336; padding: 30px; border-radius: 10px; max-width: 500px;">
            <h2 style="margin: 0 0 15px 0;">🚫 Acesso Negado</h2>
            <p style="margin: 0 0 20px 0; font-size: 16px;">${message}</p>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">
                Redirecionando para login em <span id="countdown">5</span> segundos...
            </p>
        </div>
    `;
    
    document.body.appendChild(accessDenied);
    
    // Contador regressivo
    let countdown = 5;
    const countdownElement = document.getElementById('countdown');
    
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownElement) {
            countdownElement.textContent = countdown;
        }
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            const redirectUrl = `/login/?error=${encodeURIComponent(message)}`;
            window.location.href = redirectUrl;
        }
    }, 1000);
}

function updateUserInterface(user) {
    console.log('🎨 Atualizando interface do usuário');
    
    // Atualizar elementos com data-user attribute
    document.querySelectorAll('[data-user]').forEach(el => {
        const prop = el.getAttribute('data-user');
        if (user[prop]) {
            el.textContent = user[prop];
            console.log(`✅ Atualizado ${prop}: ${user[prop]}`);
        }
    });
    
    // Atualizar elementos com IDs específicos
    const elementsToUpdate = {
        'userName': user.nome,
        'userCpf': user.cpf,
        'userTurma': user.turma,
        'userType': user.tipo,
        'nomeAluno': user.nome,
        'userInfo': `${user.nome} (${user.turma || user.tipo})`
    };
    
    Object.entries(elementsToUpdate).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element && value) {
            element.textContent = value;
            console.log(`✅ Atualizado #${id}: ${value}`);
        }
    });
    
    // Atualizar elementos por classe
    const nameElements = document.querySelectorAll('.user-name, .userName');
    nameElements.forEach(el => {
        if (user.nome) el.textContent = user.nome;
    });
    
    const cpfElements = document.querySelectorAll('.user-cpf, .userCpf');
    cpfElements.forEach(el => {
        if (user.cpf) el.textContent = `CPF: ${formatCPF(user.cpf)}`;
    });
    
    const turmaElements = document.querySelectorAll('.user-turma, .userTurma');
    turmaElements.forEach(el => {
        if (user.turma) el.textContent = `Turma: ${user.turma}`;
    });
}

function formatCPF(cpf) {
    if (!cpf || cpf.length !== 11) return cpf;
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}