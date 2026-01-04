/**
 * @file logger.js
 * @description Microsserviço de auditoria. Consome a fila de logs e persiste 
 * as confirmações de envio em um arquivo físico para consulta do dashboard.
 */

require('dotenv').config();
const amqp = require('amqplib');
const fs = require('fs');

/** @description URL de conexão com o broker RabbitMQ obtida via ambiente. */
const CLOUD_AMQP_URL = process.env.AMQP_URL;

/**
 * @function iniciarLogger
 * @description Inicializa o consumidor da fila de logs e gerencia a persistência em arquivo.
 */
async function iniciarLogger() {
    try {
        // Validação preventiva da URL de conexão
        if (!CLOUD_AMQP_URL) {
            throw new Error("AMQP_URL não definida no arquivo .env");
        }

        const conexao = await amqp.connect(CLOUD_AMQP_URL);
        const canal = await conexao.createChannel();
        const fila = 'fila_logs';

        /** * Garante a existência da fila de logs. 
         * O parâmetro durable: true garante que os logs não processados sobrevivam a quedas do broker.
         */
        await canal.assertQueue(fila, { durable: true });

        console.log("[-] SERVIÇO DE LOG ATIVO");
        console.log("[-] Aguardando confirmações de envio para registrar...\n");

        canal.consume(fila, (msg) => {
            if (!msg) return;

            try {
                const dados = JSON.parse(msg.content.toString());
                
                /** * Formatação do registro de auditoria. 
                 * Inclui timestamp, nome da empresa/candidato e o status da operação.
                 */
                const linhaRegistro = `[${dados.data}] EMPRESA: ${dados.empresa} | STATUS: ${dados.status}\n`;

                /** * Persistência Síncrona (Append).
                 * O flag 'a' garante que o conteúdo novo seja adicionado ao final do arquivo sem sobrescrever o anterior.
                 */
                fs.appendFileSync('relatorio_envios.txt', linhaRegistro);

                console.log(`[LOG] Registro salvo para: ${dados.empresa}`);

                /** * Acknowledge: Informa ao RabbitMQ que o log foi persistido com sucesso 
                 * e pode ser removido da fila.
                 */
                canal.ack(msg);
            } catch (err) {
                console.error("❌ Erro ao processar mensagem de log:", err.message);
                // Em caso de erro de processamento, a mensagem é rejeitada
                canal.nack(msg, false, true);
            }
        });

    } catch (erro) {
        console.error("❌ Erro Crítico no Microserviço de Log:", erro.message);
    }
}

iniciarLogger();

