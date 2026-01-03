require('dotenv').config(); // Carrega as variáveis do .env
const amqp = require('amqplib');
const nodemailer = require('nodemailer');
const fs = require('fs');

// Configurações obtidas via Variáveis de Ambiente
const CLOUD_AMQP_URL = process.env.AMQP_URL;

const transportador = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function iniciarWorker() {
    // Validação de segurança básica
    if (!CLOUD_AMQP_URL || !process.env.EMAIL_USER) {
        console.error("[❌] Erro: Variáveis de ambiente não configuradas no .env");
        process.exit(1);
    }

    try {
        const conexao = await amqp.connect(CLOUD_AMQP_URL);
        const canal = await conexao.createChannel();

        await canal.assertQueue('fila_envios', { durable: true });
        await canal.assertQueue('fila_logs', { durable: true });

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

                if (dados.caminhoAnexo && fs.existsSync(dados.caminhoAnexo)) {
                    mailOptions.attachments = [{
                        filename: dados.nomeAnexo || 'curriculo.pdf',
                        path: dados.caminhoAnexo
                    }];
                }

                await transportador.sendMail(mailOptions);
                console.log(`[✅] E-mail enviado com sucesso para ${dados.nome}`);

                const logMsg = JSON.stringify({
                    empresa: dados.nome,
                    status: 'SUCESSO',
                    data: new Date().toLocaleString()
                });
                canal.sendToQueue('fila_logs', Buffer.from(logMsg));

                if (dados.caminhoAnexo && fs.existsSync(dados.caminhoAnexo)) {
                    fs.unlinkSync(dados.caminhoAnexo);
                }

                canal.ack(msg);
            } catch (err) {
                console.error(`[❌] Erro ao processar ${dados.nome}:`, err.message);
                // Reenfileira a mensagem em caso de erro
                setTimeout(() => canal.nack(msg), 5000);
            }
        });
    } catch (e) {
        console.error("Erro na conexão com RabbitMQ:", e);
    }
}

iniciarWorker();

