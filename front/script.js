// Isso espera o HTML carregar
document.addEventListener('DOMContentLoaded', () => {

    // 1. Encontra o botão pelo ID dele
    const botao = document.getElementById('meu-botao');

    // 2. Adiciona um "ouvinte" de clique
    botao.addEventListener('click', () => {
        alert('O JavaScript está funcionando!');
        console.log('Botão clicado!');
    });

    console.log('Página carregada e JS pronto.');
});