# bot.py
from iqoptionapi.stable_api import IQ_Option
import time
import os
import json
from datetime import datetime

EMAIL = os.environ.get("IQ_EMAIL")
SENHA = os.environ.get("IQ_SENHA")

def log(mensagem, tipo="INFO"):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{tipo}] {mensagem}")

def conectar():
    log("Conectando na IQ Option...")

    if not EMAIL or not SENHA:
        log("EMAIL ou SENHA não configurados no GitHub Secrets!", "ERRO")
        return None

    api = IQ_Option(EMAIL, SENHA)
    # O método 'connect' em versões mais novas já retorna um booleano
    check_conectado = api.connect()
    
    if check_conectado:
        log("Conectado com sucesso!")
        # Muda para conta DEMO (mais seguro para testes)
        api.change_balance("PRACTICE")
        saldo = api.get_balance()
        log(f"Saldo: ${saldo}")
        return api
    else:
        log("Falha na conexão. Verifique suas credenciais.", "ERRO")
        return None

def calcular_rsi(fechamentos, periodo=14):
    if len(fechamentos) < periodo + 1:
        return 50
    
    ganhos, perdas = 0, 0
    for i in range(1, len(fechamentos)):
        diff = fechamentos[i] - fechamentos[i-1]
        if diff > 0:
            ganhos += diff
        else:
            perdas += abs(diff)
    
    if perdas == 0:
        return 100
    if ganhos == 0:
        return 0
        
    return 100 - (100 / (1 + (ganhos/periodo)/(perdas/periodo)))

def calcular_ma(fechamentos, periodo):
    if len(fechamentos) < periodo:
        return fechamentos[-1]
    return sum(fechamentos[-periodo:]) / periodo

def analisar_sinal(candles):
    if not candles or len(candles) < 50:
        return "NEUTRAL", 0
    
    # Pega apenas os fechamentos dos candles COMPLETOS
    fechamentos = [c['close'] for c in candles[:-1]]
    
    if len(fechamentos) < 50:
        return "NEUTRAL", 0
    
    rsi = calcular_rsi(fechamentos)
    ma20 = calcular_ma(fechamentos, 20)
    ma50 = calcular_ma(fechamentos, 50)
    
    sinal = "NEUTRAL"
    confianca = 0
    
    if rsi < 35 and ma20 > ma50:
        sinal = "CALL"
        confianca = int(70 + (35 - rsi))
    elif rsi > 65 and ma20 < ma50:
        sinal = "PUT"
        confianca = int(70 + (rsi - 65))
    elif rsi < 40:
        sinal = "CALL"
        confianca = 55
    elif rsi > 60:
        sinal = "PUT"
        confianca = 55
    
    confianca = min(confianca, 95)
    
    return sinal, confianca

def executar_operacao(api, par, direcao, valor=5.00):
    log(f"Executando {direcao} em {par} com ${valor}")
    
    try:
        # 'buy' retorna status booleano, id da ordem e tempo de expiração
        resultado, id_ordem, expiration = api.buy(valor, par, direcao, 1)
        
        if resultado:
            log(f"✅ Ordem executada! ID: {id_ordem}")
            return True
        else:
            log("❌ Falha na ordem", "ERRO")
            return False
    except Exception as e:
        log(f"Erro: {e}", "ERRO")
        return False

def main():
    log("=" * 50)
    log("🤖 IQ OPTION BOT INICIADO")
    log("=" * 50)
    
    PARES = ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD"]
    
    api = conectar()
    if not api:
        return

    log(f"Analisando {len(PARES)} pares...")
    
    for par in PARES:
        log(f"\n📊 {par}")
        
        # Buscando 100 candles de 5 minutos
        candles = api.get_candles(par, 5, 100)
        
        if not candles:
            log("Erro ao obter candles", "ERRO")
            continue
        
        sinal, confianca = analisar_sinal(candles)
        log(f"Sinal: {sinal} (confiança {confianca}%)")
        
        if sinal != "NEUTRAL" and confianca >= 60:
            log(f"🎯 ENTRADA CONFIRMADA!")
            executar_operacao(api, par, sinal)
        else:
            log("⏸ Sem entrada")
        
        time.sleep(2)
    
    log("\n✅ Bot finalizado!")

if __name__ == "__main__":
    main()
