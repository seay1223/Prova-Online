document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');

    // Carregar as credenciais do arquivo externo
    async function carregarCredenciais() {
        try {
            const response = await fetch('/js/credenciais.js');
            if (!response.ok) {
                throw new Error('Não foi possível carregar as credenciais');
            }
            
            const data = await response.text();
            
            // Extrair as credenciais do arquivo
            const alunosMatch = data.match(/alunos:\s*\[([^\]]+)\]/);
            const professoresMatch = data.match(/professores:\s*\[([^\]]+)\]/);
            const senhaMatch = data.match(/senhaPadrao:\s*'([^']+)'/);
            
            if (!alunosMatch || !professoresMatch || !senhaMatch) {
                throw new Error('Formato de arquivo de credenciais inválido');
            }
            
            // Processar as credenciais
            const alunos = alunosMatch[1].split(',').map(email => email.trim().replace(/['"]/g, ''));
            const professores = professoresMatch[1].split(',').map(email => email.trim().replace(/['"]/g, ''));
            const senhaPadrao = senhaMatch[1];
            
            return { alunos, professores, senhaPadrao };
        } catch (error) {
            console.error('Erro ao carregar credenciais:', error);
            showError('Erro interno do sistema. Entre em contato com o administrador.');
            return null;
        }
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            removeMessages();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const tipo = document.querySelector('input[name="tipo"]:checked')?.value;

            if (!email || !password || !tipo) {
                showError('Por favor, preencha todos os campos e selecione o tipo de usuário.');
                return;
            }

            if (!isValidEmail(email)) {
                showError('Por favor, insira um e-mail válido.');
                return;
            }

            // Carregar as credenciais
            const credenciais = await carregarCredenciais();
            if (!credenciais) return;

            // Verificar as credenciais
            let credencialValida = false;
            
            if (tipo === 'aluno') {
                credencialValida = credenciais.alunos.includes(email) && password === credenciais.senhaPadrao;
            } else if (tipo === 'professor') {
                credencialValida = credenciais.professores.includes(email) && password === credenciais.senhaPadrao;
            }

            if (credencialValida) {
                // Gera link único aleatório (token)
                const linkUnico = gerarLinkUnico(16);

                // Cria objeto de usuário
                const userComToken = {
                    email: email,
                    tipo: tipo,
                    linkUnico: linkUnico
                };

                // Salva no localStorage
                localStorage.setItem('usuarioLogado', JSON.stringify(userComToken));
                showSuccess('Login realizado com sucesso! Redirecionando...');

                setTimeout(() => {
                    // Redireciona para o tipo de usuário + token como query string
                    window.location.href = `/${tipo}?token=${linkUnico}`;
                }, 1500);
            } else {
                showError('Email ou senha incorretos. Por favor, tente novamente.');
            }
        });
    }

    // Se já estiver logado, redireciona direto para a página com token
    const usuarioLogado = localStorage.getItem('usuarioLogado');
    if (usuarioLogado && window.location.pathname === '/login') {
        const usuario = JSON.parse(usuarioLogado);
        if (usuario.tipo && usuario.linkUnico) {
            window.location.href = `/${usuario.tipo}?token=${usuario.linkUnico}`;
        }
    }

    // Gera uma string aleatória para o link único
    function gerarLinkUnico(tamanho) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let resultado = '';
        for (let i = 0; i < tamanho; i++) {
            resultado += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return resultado;
    }

    // Valida email básico
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function showError(mensagem) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.style.color = '#d9534f';
        errorDiv.style.backgroundColor = '#f2dede';
        errorDiv.style.padding = '10px';
        errorDiv.style.borderRadius = '5px';
        errorDiv.style.marginBottom = '15px';
        errorDiv.style.border = '1px solid #d43f3a';
        errorDiv.textContent = mensagem;
        loginForm.parentNode.insertBefore(errorDiv, loginForm);
    }

    function showSuccess(mensagem) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.color = '#23d160';
        successDiv.style.backgroundColor = '#e6fffa';
        successDiv.style.padding = '10px';
        successDiv.style.borderRadius = '5px';
        successDiv.style.marginBottom = '15px';
        successDiv.style.border = '1px solid #23d160';
        successDiv.textContent = mensagem;
        loginForm.parentNode.insertBefore(successDiv, loginForm);
    }

    function removeMessages() {
        const messages = document.querySelectorAll('.error-message, .success-message');
        messages.forEach(msg => msg.remove());
    }
});