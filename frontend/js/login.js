// login.js - CORRIGIDO
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

                // Cria objeto de usuário - CORREÇÃO: Salvar com as chaves que aluno.js espera
                const userData = {
                    email: email,
                    tipo: tipo,
                    linkUnico: linkUnico,
                    // Adicionar campos que aluno.js espera
                    id: email, // Usando email como ID temporário
                    name: email.split('@')[0] // Nome baseado no email
                };

                // Salva no localStorage - CORREÇÃO: Usar as chaves corretas
                localStorage.setItem('userData', JSON.stringify(userData));
                localStorage.setItem('authToken', linkUnico); // Salvar token separadamente
                
                showSuccess('Login realizado com sucesso! Redirecionando...');

                setTimeout(() => {
                    // Redireciona para a página correta
                    if (tipo === 'aluno') {
                        window.location.href = '/aluno';
                    } else {
                        window.location.href = '/professor';
                    }
                }, 1500);
            } else {
                showError('Email ou senha incorretos. Por favor, tente novamente.');
            }
        });
    }

    // Se já estiver logado, redireciona direto para a página correta - CORREÇÃO
    const userData = localStorage.getItem('userData');
    const authToken = localStorage.getItem('authToken');
    
    if (userData && authToken && window.location.pathname === '/login') {
        try {
            const usuario = JSON.parse(userData);
            if (usuario.tipo) {
                if (usuario.tipo === 'aluno') {
                    window.location.href = '/aluno';
                } else if (usuario.tipo === 'professor') {
                    window.location.href = '/professor';
                }
            }
        } catch (e) {
            console.error('Erro ao parsear userData:', e);
            // Limpar dados inválidos
            localStorage.removeItem('userData');
            localStorage.removeItem('authToken');
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
        errorDiv.style.cssText = `
            color: #d9534f;
            background-color: #f2dede;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
            border: 1px solid #d43f3a;
        `;
        errorDiv.textContent = mensagem;
        loginForm.parentNode.insertBefore(errorDiv, loginForm);
    }

    function showSuccess(mensagem) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.style.cssText = `
            color: #23d160;
            background-color: #e6fffa;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 15px;
            border: 1px solid #23d160;
        `;
        successDiv.textContent = mensagem;
        loginForm.parentNode.insertBefore(successDiv, loginForm);
    }

    function removeMessages() {
        const messages = document.querySelectorAll('.error-message, .success-message');
        messages.forEach(msg => msg.remove());
    }
});