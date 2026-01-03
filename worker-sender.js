const amqp = require('amqplib');
const nodemailer = require('nodemailer');
const fs = require('fs');

const CLOUD_AMQP_URL = 'amqps://ozzqvboe:HC7qH-SL9VjJgcuAxws8py-t-FlofO-n@jackal.rmq.cloudamqp.com/ozzqvboe';

const transportador = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "fa61b5e9624d68",
    pass: "71d21bbed66442"
  }
});

async function iniciarWorker() {
    try {
        const conexao = await amqp.connect(CLOUD_AMQP_URL);
        const canal = await conexao.createChannel();

        await canal.assertQueue('fila_envios', { durable: true });
        await canal.assertQueue('fila_logs', { durable: true });

        canal.prefetch(1);
        console.log("[-] Worker pronto para enviar currículos com anexos...");

        canal.consume('fila_envios', async (msg) => {
            const dados = JSON.parse(msg.content.toString());
            console.log(`[📩] Processando envio para: ${dados.nome}`);

            try {
                const mailOptions = {
                    from: '"Seu Nome" <seu-email@exemplo.com>',
                    to: dados.email,
                    subject: `Candidatura: ${dados.vaga}`,
                    text: `Olá ${dados.nome}, segue meu currículo em anexo.`,
                };

                // Verifica se existe um caminho de anexo enviado pelo formulário
                if (dados.caminhoAnexo && fs.existsSync(dados.caminhoAnexo)) {
                    mailOptions.attachments = [{
                        filename: dados.nomeAnexo || 'curriculo.pdf',
                        path: dados.caminhoAnexo
                    }];
                }

                await transportador.sendMail(mailOptions);
                console.log(`[✅] E-mail enviado com sucesso para ${dados.nome}`);

                // Envia para o Logger
                const logMsg = JSON.stringify({
                    empresa: dados.nome,
                    status: 'SUCESSO',
                    data: new Date().toLocaleString()
                });
                canal.sendToQueue('fila_logs', Buffer.from(logMsg));

                // Remove o arquivo temporário do Termux após o envio para não encher a memória
                if (dados.caminhoAnexo && fs.existsSync(dados.caminhoAnexo)) {
                    fs.unlinkSync(dados.caminhoAnexo);
                }

                canal.ack(msg);
            } catch (err) {
                console.error(`[❌] Erro ao processar ${dados.nome}:`, err.message);
                setTimeout(() => canal.nack(msg), 5000);
            }
        });
    } catch (e) {
        console.error("Erro na conexão com RabbitMQ:", e);
    }
}

iniciarWorker();
