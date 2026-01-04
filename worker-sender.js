/**
 * @file worker-sender.js
 * @description Worker responsável por consumir a fila de envios, 
 * disparar e-mails via SMTP e registrar o sucesso na fila de logs.
 */

require('dotenv').config();
const amqp = require('amqplib');
const nodemailer = require('nodemailer');
const fs = require('fs');

/** @description URL de conexão com o broker RabbitMQ obtida via ambiente. */
const CLOUD_AMQP_URL = process.env.AMQP_URL;

/** * Configuração do serviço de transporte de e-mail.
 * Utiliza variáveis de ambiente para suportar diferentes provedores (Mailtrap/Gmail/etc).
 */
const transportador = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * @function iniciarWorker
 * @description Inicializa o consumidor de mensagens e define as regras de processamento.
 */
async function iniciarWorker() {
    // Validação preventiva das dependências de ambiente
    if (!CLOUD_AMQP_URL || !process.env.EMAIL_USER) {
        console.error("[❌] Erro: Variáveis de ambiente não configuradas no .env");
        process.exit(1);
    }

    try {
        const conexao = await amqp.connect(CLOUD_AMQP_URL);
        const canal = await conexao.createChannel();

        // Garante a existência das filas necessárias para o fluxo
        await canal.assertQueue('fila_envios', { durable: true });
        await canal.assertQueue('fila_logs', { durable: true });

        /** * Controle de fluxo: prefetch(1) garante que o worker processe 
         * apenas uma mensagem por vez, evitando sobrecarga. 
         */
        canal.prefetch(1);
        console.log("[-] Worker pronto e operando com variáveis de ambiente...");

        canal.consume('fila_envios', async (msg) => {
            if (!msg) return;
            
            const dados = JSON.parse(msg.content.toString());
            console.log(`[📩] Processando envio para: ${dados.nome}`);

            try {
                const mailOptions = {
                    from: '"Seu Portfólio" <noreply@exemplo.com>',
                    to: dados.email,
                    subject: `Candidatura: ${dados.vaga}`,
                    text: `Olá ${dados.nome}, segue meu currículo em anexo.`,
                };

                // Anexa o arquivo PDF caso o caminho seja válido
                if (dados.caminhoAnexo && fs.existsSync(dados.caminhoAnexo)) {
                    mailOptions.attachments = [{
                        filename: dados.nomeAnexo || 'curriculo.pdf',
                        path: dados.caminhoAnexo
                    }];
                }

                // Executa o envio do e-mail
                await transportador.sendMail(mailOptions);
                console.log(`[✅] E-mail enviado com sucesso para ${dados.nome}`);

                // Notifica o serviço de Logger sobre o sucesso do evento
                const logMsg = JSON.stringify({
                    empresa: dados.nome,
                    status: 'SUCESSO',
                    data: new Date().toLocaleString()
                });
                canal.sendToQueue('fila_logs', Buffer.from(logMsg));

                // Limpeza: Remove o arquivo temporário para otimizar espaço em disco
                if (dados.caminhoAnexo && fs.existsSync(dados.caminhoAnexo)) {
                    fs.unlinkSync(dados.caminhoAnexo);
                }

                // Confirma o processamento da mensagem (Acknowledge)
                canal.ack(msg);
            } catch (err) {
                console.error(`[❌] Erro ao processar ${dados.nome}:`, err.message);
                /** * Em caso de falha, a mensagem retorna para a fila após 5 segundos
                 * para uma nova tentativa (Negative Acknowledge).
                 */
                setTimeout(() => canal.nack(msg), 5000);
            }
        });
    } catch (e) {
        console.error("Erro crítico na conexão com RabbitMQ:", e);
    }
}

iniciarWorker();

