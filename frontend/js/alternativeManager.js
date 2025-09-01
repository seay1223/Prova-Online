// Contador de alternativas
let alternativeCount = 2;

// Função para adicionar alternativa
function addAlternative() {
    const alternativesContainer = document.getElementById('alternatives-container');
    const newAlternative = document.createElement('div');
    newAlternative.className = 'alternative-item';
    
    const letter = String.fromCharCode(65 + alternativeCount); // A, B, C, etc.
    
    newAlternative.innerHTML = `
        <input type="radio" name="correct-answer" value="${alternativeCount}">
        <input type="text" placeholder="Alternativa ${letter}">
        <button class="btn-danger remove-alternative">X</button>
    `;
    
    alternativesContainer.insertBefore(newAlternative, document.getElementById('add-alternative'));
    
    // Adicionar listener para o botão de remover
    newAlternative.querySelector('.remove-alternative').addEventListener('click', function() {
        if (document.querySelectorAll('.alternative-item').length > 2) {
            this.parentElement.remove();
        } else {
            alert('A questão deve ter pelo menos 2 alternativas.');
        }
    });
    
    alternativeCount++;
}

// Função para alternar a visibilidade das alternativas
function toggleAlternatives() {
    const questionType = document.getElementById('question-type').value;
    const alternativesContainer = document.getElementById('alternatives-container');
    
    if (questionType === 'multiple' || questionType === 'truefalse') {
        alternativesContainer.style.display = 'block';
        
        // Se for verdadeiro/falso, criar opções específicas
        if (questionType === 'truefalse') {
            alternativesContainer.innerHTML = `
                <h4>Alternativas</h4>
                <div class="alternative-item">
                    <input type="radio" name="correct-answer" value="0">
                    <input type="text" value="Verdadeiro" readonly>
                    <button class="btn-danger remove-alternative" disabled>X</button>
                </div>
                <div class="alternative-item">
                    <input type="radio" name="correct-answer" value="1">
                    <input type="text" value="Falso" readonly>
                    <button class="btn-danger remove-alternative" disabled>X</button>
                </div>
            `;
            // Re-adicionar o botão de adicionar alternativa
            const addButton = document.createElement('button');
            addButton.className = 'btn-secondary';
            addButton.id = 'add-alternative';
            addButton.textContent = '+ Adicionar Alternativa';
            addButton.addEventListener('click', addAlternative);
            alternativesContainer.appendChild(addButton);
        }
    } else {
        alternativesContainer.style.display = 'none';
    }
}

// Função para resetar as alternativas
function resetAlternatives() {
    alternativeCount = 2;
    const alternativesContainer = document.getElementById('alternatives-container');
    alternativesContainer.innerHTML = `
        <h4>Alternativas</h4>
        <div class="alternative-item">
            <input type="radio" name="correct-answer" value="0">
            <input type="text" placeholder="Alternativa A">
            <button class="btn-danger remove-alternative">X</button>
        </div>
        <div class="alternative-item">
            <input type="radio" name="correct-answer" value="1">
            <input type="text" placeholder="Alternativa B">
            <button class="btn-danger remove-alternative">X</button>
        </div>
        <button class="btn-secondary" id="add-alternative">+ Adicionar Alternativa</button>
    `;
    
    // Re-adicionar event listeners
    document.getElementById('add-alternative').addEventListener('click', addAlternative);
    document.querySelectorAll('.remove-alternative').forEach(button => {
        button.addEventListener('click', function() {
            if (document.querySelectorAll('.alternative-item').length > 2) {
                this.parentElement.remove();
            } else {
                alert('A questão deve ter pelo menos 2 alternativas.');
            }
        });
    });
}

// Função para obter as alternativas do formulário
function getAlternativesFromForm() {
    const alternativeItems = document.querySelectorAll('.alternative-item');
    const alternatives = [];
    let correctAnswer = -1;
    
    alternativeItems.forEach((item, index) => {
        const textInput = item.querySelector('input[type="text"]');
        const radioInput = item.querySelector('input[type="radio"]');
        
        if (textInput.value.trim()) {
            alternatives.push(textInput.value.trim());
            
            if (radioInput.checked) {
                correctAnswer = index;
            }
        }
    });
    
    return { alternatives, correctAnswer };
}