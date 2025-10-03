document.addEventListener('DOMContentLoaded', function() {
    console.log('=== PÁGINA URL ÚNICA CARREGADA ===');
    
    function formatarCPF(cpf) {
        if (!cpf) return '';
        cpf = cpf.replace(/\D/g, '');
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }

    function atualizarInterface(user) {
        if (!user || !user.nome || !user.cpf || !user.id) {
            throw new Error('Dados do usuário incompletos');
        }
        
        document.getElementById('userName').textContent = user.nome;
        document.getElementById('userCpf').textContent = `CPF: ${formatarCPF(user.cpf)}`;
        document.getElementById('userType').textContent = `Tipo: ${user.tipo}`;
        
        let urlUnica;
        if (user.tipo === 'aluno') {
            urlUnica = `http://localhost:3000/aluno/${user.id}`;
        } else if (user.tipo === 'professor') {
            urlUnica = `http://localhost:3000/professor/${user.id}`;
        } else {
            throw new Error('Tipo de usuário não suportado');
        }
        
        document.getElementById('urlInput').value = urlUnica;
        
        console.log(`✅ Interface atualizada com sucesso para ${user.tipo}!`);
        console.log(`🔗 URL única gerada: ${urlUnica}`);
    }

    // Verificar autenticação e carregar dados do usuário
    fetch('/api/auth/check', {
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) throw new Error('Falha na autenticação');
        return response.json();
    })
    .then(data => {
        if (data.isAuthenticated && data.user && (data.user.tipo === 'aluno' || data.user.tipo === 'professor')) {
            console.log(`✅ Usuário autenticado (${data.user.tipo}):`, data.user);
            atualizarInterface(data.user);
        } else {
            console.error('❌ Acesso negado. Tipo de usuário não permitido.');
            window.location.href = '/login/?error=Acesso restrito a alunos ou professores';
        }
    })
    .catch(error => {
        console.error('❌ Erro crítico:', error);
        alert('Erro ao carregar seus dados. Por favor, faça login novamente.');
        window.location.href = '/login/';
    });

    window.copyUrl = function() {
        const urlInput = document.getElementById("urlInput");
        urlInput.select();
        urlInput.setSelectionRange(0, 99999);

        try {
            navigator.clipboard.writeText(urlInput.value);
            showToast("✅ URL copiada para a área de transferência!");
        } catch (err) {
            document.execCommand("copy");
            showToast("✅ URL copiada!");
        }
    }

    window.openUrl = function() {
        const urlInput = document.getElementById("urlInput");
        window.open(urlInput.value, "_self");
    }

    window.shareUrl = async function() {
        const urlInput = document.getElementById("urlInput");

        try {
            if (navigator.share) {
                await navigator.share({
                    title: "Minha Área - PROVA-ONLINE",
                    text: "Acesse minha área exclusiva no sistema PROVA-ONLINE",
                    url: urlInput.value,
                });
            } else {
                copyUrl();
                showToast("✅ URL copiada! Compartilhe manualmente.");
            }
        } catch (error) {
            console.log("Compartilhamento cancelado");
        }
    }

    function showToast(message) {
        const toast = document.getElementById("toast");
        toast.textContent = message;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }
});