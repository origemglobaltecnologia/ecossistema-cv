const amqp = require('amqplib');
const fs = require('fs');

// URL do seu RabbitMQ
const CLOUD_AMQP_URL = 'amqps://ozzqvboe:HC7qH-SL9VjJgcuAxws8py-t-FlofO-n@jackal.rmq.cloudamqp.com/ozzqvboe';

async function iniciarLogger() {
    try {
        const conexao = await amqp.connect(CLOUD_AMQP_URL);
        const canal = await conexao.createChannel();
        const fila = 'fila_logs';

        // Garante que a fila de logs existe
        await canal.assertQueue(fila, { durable: true });

        console.log("[-] SERVIÇO DE LOG ATIVO");
        console.log("[-] Aguardando confirmações de envio para registrar...\n");

        canal.consume(fila, (msg) => {
            const dados = JSON.parse(msg.content.toString());
            
            // Formata a linha que será escrita no arquivo
            const linhaRegistro = `[${dados.data}] EMPRESA: ${dados.empresa} | STATUS: ${dados.status}\n`;

            // Escreve no arquivo 'relatorio_envios.txt' (o comando 'a' significa append/adicionar ao final)
            fs.appendFileSync('relatorio_envios.txt', linhaRegistro);

            console.log(`[LOG] Registro salvo para: ${dados.empresa}`);

            // Confirma para o RabbitMQ que o log foi salvo
            canal.ack(msg);
        });

    } catch (erro) {
        console.error("❌ Erro no Microserviço de Log:", erro);
    }
}

iniciarLogger();

