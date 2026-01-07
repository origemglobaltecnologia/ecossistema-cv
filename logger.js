/**
 * @file logger.js
 * @description Escuta a fila de logs e persiste os eventos em um arquivo físico.
 * Atualizado com lógica de auto-reconexão para evitar erros ECONNABORTED.
 */

require('dotenv').config();
const amqp = require('amqplib');
const fs = require('fs');

const CLOUD_AMQP_URL = process.env.AMQP_URL;

async function iniciarLogger() {
    try {
        console.log("[📡] Conectando ao serviço de logs...");
        const conexao = await amqp.connect(CLOUD_AMQP_URL);
        
        // Tratamento para o erro ECONNABORTED visto no terminal
        conexao.on("error", (err) => {
            console.error("[🚨] Erro na conexão RabbitMQ:", err.message);
            setTimeout(iniciarLogger, 5000); // Tenta reconectar em 5s
        });

        conexao.on("close", () => {
            console.warn("[⚠️] Conexão com RabbitMQ fechada. Reconectando...");
            setTimeout(iniciarLogger, 5000);
        });

        const canal = await conexao.createChannel();
        await canal.assertQueue('fila_logs', { durable: true });

        console.log("[📝] Logger pronto e aguardando eventos...");

        canal.consume('fila_logs', (msg) => {
            if (msg !== null) {
                const evento = JSON.parse(msg.content.toString());
                
                // Formatação da linha de log para o Dashboard
                const linhaLog = `[${evento.data}] EMPRESA: ${evento.empresa} | VAGA: ${evento.vaga} | ${evento.status}\n`;

                // AppendFile garante que não sobrescrevemos o histórico anterior
                fs.appendFileSync('relatorio_envios.txt', linhaLog);
                
                console.log(`[💾] Log registrado: ${evento.empresa}`);
                canal.ack(msg);
            }
        });
    } catch (error) {
        console.error("[❌] Erro ao iniciar Logger:", error.message);
        setTimeout(iniciarLogger, 10000); // Tenta novamente em 10s se o servidor estiver fora
    }
}

// Inicia o processo
iniciarLogger();

