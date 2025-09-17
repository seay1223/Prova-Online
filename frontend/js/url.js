document.addEventListener('DOMContentLoaded', function() {
    console.log('=== PÁGINA URL ÚNICA CARREGADA ===');
    
    // Verificar se o usuário está autenticado
    fetch('/api/auth/check', {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(data => {
        if (data.isAuthenticated && data.user) {
            // Atualizar informações do usuário
            document.getElementById('userName').textContent = data.user.nome;
            document.getElementById('userCpf').textContent = `CPF: ${formatarCPF(data.user.cpf)}`;
            
            // Buscar URL única do servidor
            buscarUrlUnica(data.user);
        } else {
            // Redirecionar para login se não estiver autenticado
            window.location.href = '/login/?error=Sessão expirada';
        }
    })
    .catch(error => {
        console.error('Erro ao verificar autenticação:', error);
        window.location.href = '/login/?error=Erro de autenticação';
    });
    
    // Função para buscar a URL única do servidor
    function buscarUrlUnica(user) {
        fetch('/api/aluno/url-unica', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao buscar URL única');
            }
            return response.json();
        })
        .then(data => {
            if (data.url_unica) {
                document.getElementById('urlInput').value = data.url_unica;
            } else {
                document.getElementById('urlInput').value = 'Erro ao gerar URL';
            }
        })
        .catch(error => {
            console.error('Erro ao buscar URL única:', error);
            document.getElementById('urlInput').value = 'Erro ao carregar URL';
        });
    }
    
    // Função para formatar CPF
    function formatarCPF(cpf) {
        if (!cpf) return '';
        cpf = cpf.replace(/\D/g, '');
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
});

// Função para copiar a URL com API Clipboard moderna
function copyUrl() {
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

// Função para abrir a URL em nova guia
function openUrl() {
    const urlInput = document.getElementById("urlInput");
    window.open(urlInput.value, "_blank");
}

// Função para compartilhar a URL
async function shareUrl() {
    const urlInput = document.getElementById("urlInput");

    try {
        if (navigator.share) {
            await navigator.share({
                title: "Minha Área do Aluno - PROVA-ONLINE",
                text: "Acesse minha área exclusiva no sistema PROVA-ONLINE",
                url: urlInput.value,
            });
        } else {
            copyUrl();
        }
    } catch (error) {
        console.log("Compartilhamento cancelado");
    }
}

// Função para exibir notificação toast
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}