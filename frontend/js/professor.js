document.addEventListener('DOMContentLoaded', function() {
    // Verificar se é professor
    const usuario = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuario || usuario.tipo !== 'professor') {
        window.location.href = '/login';
        return;
    }

    // Modal functionality
    const modal = document.getElementById('modal-prova');
    const span = document.querySelector('.close');

    window.abrirModalCriarProva = function() {
        modal.style.display = 'block';
    }

    span.onclick = function() {
        modal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }

    // Form submission
    document.getElementById('form-prova').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const provaData = {
            titulo: document.getElementById('titulo-prova').value,
            disciplina: document.getElementById('disciplina-prova').value,
            data_limite: document.getElementById('data-limite').value,
            tempo_limite: parseInt(document.getElementById('tempo-limite').value),
            descricao: document.getElementById('descricao-prova').value
        };

        fetch('/api/provas', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(provaData)
        })
        .then(response => response.json())
        .then(data => {
            alert('Prova criada com sucesso!');
            modal.style.display = 'none';
            document.getElementById('form-prova').reset();
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao criar prova');
        });
    });

    // Logout
    document.querySelector('.logout-btn').addEventListener('click', function() {
        if (confirm('Tem certeza que deseja sair?')) {
            localStorage.removeItem('usuarioLogado');
            window.location.href = '/login';
        }
    });
});

window.carregarProvas = function() {
    fetch('/api/provas')
        .then(response => response.json())
        .then(provas => {
            const container = document.getElementById('provas-container');
            const lista = document.getElementById('lista-provas');
            
            lista.style.display = 'block';
            container.innerHTML = '';
            
            if (provas.length === 0) {
                container.innerHTML = '<p>Nenhuma prova criada ainda.</p>';
                return;
            }

            provas.forEach(prova => {
                const div = document.createElement('div');
                div.className = 'prova-item';
                div.innerHTML = `
                    <h4>${prova.titulo} - ${prova.disciplina}</h4>
                    <p>Status: ${prova.status}</p>
                    <p>Criada em: ${new Date(prova.data_criacao).toLocaleDateString()}</p>
                    <button onclick="editarProva('${prova.id}')">Editar</button>
                    <button onclick="designarAlunos('${prova.id}')">Designar Alunos</button>
                `;
                container.appendChild(div);
            });
        });
};

window.editarProva = function(provaId) {
    alert('Funcionalidade de edição em desenvolvimento');
};

window.designarAlunos = function(provaId) {
    const emails = prompt('Digite os emails dos alunos separados por vírgula:');
    if (emails) {
        const listaEmails = emails.split(',').map(email => email.trim());
        
        fetch(`/api/provas/${provaId}/alunos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ alunos: listaEmails })
        })
        .then(response => response.json())
        .then(data => {
            alert('Alunos designados com sucesso!');
        })
        .catch(error => {
            console.error('Erro:', error);
            alert('Erro ao designar alunos');
        });
    }
};