const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Servir arquivos estáticos do frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rotas principais
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login/login.html'));
});

app.get('/aluno', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/aluno/aluno.html'));
});

app.get('/professor', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/professor/professor.html'));
});

app.get('/termos', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/termos/termos.html'));
});

app.get('/contato', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/contato/contato.html'));
});

app.get('/politica', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/politica/politica.html'));
});

app.use('/:pasta/:arquivo.css', (req, res) => {
    const { pasta, arquivo } = req.params;
    res.sendFile(path.join(__dirname, `../frontend/${pasta}/${arquivo}.css`));
});

// Servir JavaScript
app.use('/js/:arquivo.js', (req, res) => {
    const { arquivo } = req.params;
    res.sendFile(path.join(__dirname, `../frontend/js/${arquivo}.js`));
});

// Servir qualquer arquivo estático
app.use('/:pasta/:arquivo.:ext', (req, res) => {
    const { pasta, arquivo, ext } = req.params;
    res.sendFile(path.join(__dirname, `../frontend/${pasta}/${arquivo}.${ext}`));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('🎓 PROVA-ONLINE rodando!');
    console.log('📍 http://localhost:3000');
});