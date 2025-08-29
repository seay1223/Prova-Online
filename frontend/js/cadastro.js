document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    const submitButton = form.querySelector('.btn-login');
    
    // Adicionar evento de submit ao formulário
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Obter valores do formulário
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const userType = document.querySelector('input[name="tipo"]:checked');
        
        // Validações básicas
        if (!email || !password) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }
        
        if (!userType) {
            alert('Por favor, selecione o tipo de usuário.');
            return;
        }
        
        // Validar formato de email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Por favor, insira um email válido.');
            return;
        }
        
        // Validar força da senha
        if (password.length < 6) {
            alert('A senha deve ter pelo menos 6 caracteres.');
            return;
        }
        
        try {
            // Mostrar indicador de carregamento
            submitButton.disabled = true;
            submitButton.textContent = 'Cadastrando...';
            
            // Enviar dados para o backend
            const response = await fetch('/api/cadastro-credenciais', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    senha: password,
                    tipo: userType.value
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('Cadastro realizado com sucesso!');
                // Redirecionar para página de login
                window.location.href = '/login';
            } else {
                alert(data.message || 'Erro no cadastro. Tente novamente.');
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro de conexão. Tente novamente.');
        } finally {
            // Restaurar botão
            submitButton.disabled = false;
            submitButton.textContent = 'Cadastrar';
        }
    });
});