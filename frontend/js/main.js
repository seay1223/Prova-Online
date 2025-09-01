// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Configurar data mínima para hoje
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('exam-date').setAttribute('min', today);
    
    // Adicionar event listeners
    document.getElementById('add-alternative').addEventListener('click', addAlternative);
    document.getElementById('add-question').addEventListener('click', addQuestion);
    document.getElementById('save-exam').addEventListener('click', saveExam);
    document.getElementById('question-type').addEventListener('change', toggleAlternatives);
    
    // Adicionar listeners para remover alternativas
    document.querySelectorAll('.remove-alternative').forEach(button => {
        button.addEventListener('click', function() {
            if (document.querySelectorAll('.alternative-item').length > 2) {
                this.parentElement.remove();
            } else {
                alert('A questão deve ter pelo menos 2 alternativas.');
            }
        });
    });
    
    // Inicializar a visibilidade das alternativas
    toggleAlternatives();
    
    // Inicializar a exibição das questões
    displayQuestions();
});