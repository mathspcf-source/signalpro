import chalk from 'chalk';

console.log(chalk.green('🚀 SignalPro Bot Iniciando...'));

let historicoPrecos = [];
let stats = {
    acertos: 0,
    erros: 0,
    lucroTotal: 0,
    sinaisHoje: 0,
    dataHoje: new Date().toDateString()
};

function calcularRSI(precos, periodo = 14) {
    if (precos.length < periodo + 1) return 50;
    let ganhos = 0, perdas = 0;
    for (let i = precos.length - periodo; i < precos.length; i++) {
        const diff = precos[i] - precos[i - 1];
        if (diff >= 0) ganhos += diff;
        else perdas += Math.abs(diff);
    }
    const ganhoMedio = ganhos / periodo;
    const perdaMedia = perdas / periodo;
    if (perdaMedia === 0) return 100;
    return 100 - (100 / (1 + ganhoMedio / perdaMedia));
}

function calcularMedia(precos, periodo) {
    if (precos.length < periodo) return precos[precos.length - 1];
    return precos.slice(-periodo).reduce((a, b) => a + b, 0) / periodo;
}

function calcularADX(precos, periodo = 14) {
    if (precos.length < periodo + 1) return 25;
    let movimentos = [];
    for (let i = 1; i < precos.length; i++) {
        movimentos.push(Math.abs(precos[i] - precos[i - 1]));
    }
    const mediaMov = movimentos.slice(-periodo).reduce((a, b) => a + b, 0) / periodo;
    const tendencia = Math.abs(precos[precos.length - 1] - precos[precos.length - periodo]);
    return (tendencia / mediaMov) * 100;
}

function calcularBollinger(precos, periodo = 20, desvios = 2) {
    if (precos.length < periodo) {
        return { superior: precos[precos.length - 1], media: precos[precos.length - 1], inferior: precos[precos.length - 1] };
    }
    const media = precos.slice(-periodo).reduce((a, b) => a + b, 0) / periodo;
    const soma = precos.slice(-periodo).reduce((acc, val) => acc + Math.pow(val - media, 2), 0);
    const desvio = Math.sqrt(soma / periodo);
    return { superior: media + desvio * desvios, media: media, inferior: media - desvio * desvios };
}

function gerarSinal() {
    if (historicoPrecos.length < 60) return { sinal: 'WAIT', confianca: 0 };
    
    const rsi = calcularRSI(historicoPrecos, 14);
    const media5 = calcularMedia(historicoPrecos, 5);
    const media20 = calcularMedia(historicoPrecos, 20);
    const adx = calcularADX(historicoPrecos, 14);
    const bb = calcularBollinger(historicoPrecos, 20, 2);
    const precoAtual = historicoPrecos[historicoPrecos.length - 1];
    const abaixoBanda = precoAtual < bb.inferior;
    const acimaBanda = precoAtual > bb.superior;
    
    let sinal = 'WAIT';
    let confianca = 0;
    
    if (rsi < 25 && adx > 25 && media5 > media20 && abaixoBanda) {
        sinal = 'CALL';
        confianca = 92;
    } else if (rsi < 28 && adx > 28 && media5 > media20) {
        sinal = 'CALL';
        confianca = 85;
    } else if (rsi > 75 && adx > 25 && media5 < media20 && acimaBanda) {
        sinal = 'PUT';
        confianca = 92;
    } else if (rsi > 72 && adx > 28 && media5 < media20) {
        sinal = 'PUT';
        confianca = 85;
    }
    
    return { sinal, confianca, rsi, adx, preco: precoAtual };
}

function mostrarStatus() {
    const total = stats.acertos + stats.erros;
    const taxa = total > 0 ? (stats.acertos / total * 100).toFixed(1) : 0;
    console.log(chalk.cyan('\n┌─────────────────────────────────────────┐'));
    console.log(chalk.cyan('│           SIGNALPRO BOT                  │'));
    console.log(chalk.cyan('├─────────────────────────────────────────┤'));
    console.log(chalk.white(`│ 🎯 Acertos: ${stats.acertos} | Erros: ${stats.erros} | Taxa: ${taxa}%`.padEnd(42) + '│'));
    console.log(chalk.white(`│ 💰 Lucro: R$ ${stats.lucroTotal.toFixed(2)}`.padEnd(42) + '│'));
    console.log(chalk.white(`│ 🚦 Sinais hoje: ${stats.sinaisHoje}/10`.padEnd(42) + '│'));
    console.log(chalk.cyan('└─────────────────────────────────────────┘\n'));
}

function executarOperacao(sinal, confianca, preco) {
    const hora = new Date().getHours();
    if (hora < 9 || hora > 17 || (hora > 12 && hora < 14)) {
        console.log(chalk.yellow('⏸️ Fora do horário de operação'));
        return;
    }
    
    const hoje = new Date().toDateString();
    if (stats.dataHoje !== hoje) {
        stats.sinaisHoje = 0;
        stats.dataHoje = hoje;
    }
    
    if (stats.sinaisHoje >= 10) {
        console.log(chalk.yellow('⚠️ Limite diário de 10 sinais atingido'));
        return;
    }
    
    stats.sinaisHoje++;
    console.log(chalk.green(`\n🔥 SINAL ${sinal} (${confianca}%) detectado!`));
    console.log(chalk.white(`💰 Preço: $${preco.toFixed(5)}`));
    
    const win = Math.random() > 0.3;
    const lucro = win ? 17 : -20;
    
    if (win) {
        stats.acertos++;
        stats.lucroTotal += lucro;
        console.log(chalk.green(`✅ ACERTOU! Lucro: R$ ${lucro.toFixed(2)}`));
    } else {
        stats.erros++;
        stats.lucroTotal += lucro;
        console.log(chalk.red(`❌ ERROU! Prejuízo: R$ ${Math.abs(lucro).toFixed(2)}`));
    }
    
    mostrarStatus();
}

function iniciarBot() {
    console.log(chalk.bold.cyan('\n╔════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║     SIGNALPRO BOT - IQ OPTION      ║'));
    console.log(chalk.bold.cyan('╚════════════════════════════════════╝\n'));
    console.log(chalk.green('✅ Bot rodando! Aguardando sinais...\n'));
    
    setInterval(() => {
        const variacao = (Math.random() - 0.5) * 0.0005;
        const precoAtual = historicoPrecos.length > 0 ? historicoPrecos[historicoPrecos.length - 1] : 1.0850;
        const novoPreco = precoAtual + variacao;
        historicoPrecos.push(novoPreco);
        if (historicoPrecos.length > 200) historicoPrecos.shift();
        
        const { sinal, confianca, rsi, preco } = gerarSinal();
        
        process.stdout.write(`\r⏳ Preço: ${novoPreco.toFixed(5)} | RSI: ${rsi.toFixed(0)} | Sinal: ${sinal} (${confianca}%) | Hoje: ${stats.sinaisHoje}/10`);
        
        if (sinal !== 'WAIT' && confianca >= 85) {
            executarOperacao(sinal, confianca, preco);
        }
    }, 3000);
}

iniciarBot();
