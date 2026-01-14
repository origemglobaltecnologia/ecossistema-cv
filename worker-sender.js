/**
 * @file worker-sender.js
 * @description Worker responsável pelo envio de currículos com formatação HTML profissional.
 */

require('dotenv').config();
const amqp = require('amqplib');
const nodemailer = require('nodemailer');
const fs = require('fs');

const CLOUD_AMQP_URL = process.env.AMQP_URL;

// Configuração do transportador Gmail (Porta 465 SSL)
const transportador = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function iniciarWorker() {
    try {
        const conexao = await amqp.connect(CLOUD_AMQP_URL);
        const canal = await conexao.createChannel();

        await canal.assertQueue('fila_envios', { durable: true });
        await canal.assertQueue('fila_logs', { durable: true });

        canal.prefetch(1);
        console.log("[⚙️] Worker pronto! Mensagem HTML configurada.");

        canal.consume('fila_envios', async (msg) => {
            if (!msg) return;

            const dados = JSON.parse(msg.content.toString());
            
            try {
                // Montagem da mensagem profissional em HTML
                const mailOptions = {
                    from: `"Cristiano Origem Camejo" <${process.env.EMAIL_USER}>`,
                    to: dados.email,
                    subject: `Em busca de oportunidade como ${dados.vaga} - ${dados.nome}`,
                    // Versão em texto simples (fallback)
                    text: `Olá, este é um envio automático do currículo de ${dados.nome}. Em busca de oportunidade como ${dados.vaga}. Confira o projeto em: https://github.com/origemglobaltecnologia/ecossistema-cv`,
                    // Versão HTML (o que a maioria dos clientes de e-mail verá)
                    html: `
                        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                            <h2 style="color: #2e7d32;">Em busca de oportunidade como ${dados.vaga}</h2>
                            <p>Olá,</p>
                            <p>Este é um envio automático do currículo de <strong>${dados.nome}</strong>.</p>
                            <p>O sistema utilizado para este envio foi desenvolvido por mim como parte do meu <strong>portfólio Full Stack</strong>, utilizando Node.js, RabbitMQ e Microserviços.</p>
                            <hr style="border: 0; border-top: 1px solid #eee;" />
                            <p>Você pode conferir o código-fonte e a arquitetura deste sistema no meu GitHub:</p>
                            <p><a href="https://github.com/origemglobaltecnologia/ecossistema-cv" style="background-color: #24292e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Projeto no GitHub</a></p>
                            <br />
                            <p>Atenciosamente,<br /><strong>${dados.nome}</strong></p>
                        </div>
                    `
                };

                // Anexa o currículo
                if (dados.caminhoAnexo && fs.existsSync(dados.caminhoAnexo)) {
                    mailOptions.attachments = [{
                        filename: dados.nomeAnexo || 'curriculo.pdf',
                        path: dados.caminhoAnexo
                    }];
                }

                // Envio real
                const info = await transportador.sendMail(mailOptions);
                console.log(`[✅] E-mail enviado com sucesso! ID: ${info.messageId}`);

                // Notifica o Logger para o Dashboard
                const logMsg = JSON.stringify({
                    empresa: dados.nome,
                    vaga: dados.vaga,
                    status: 'ENVIADO ✅',
                    data: new Date().toLocaleString('pt-BR')
                });
                canal.sendToQueue('fila_logs', Buffer.from(logMsg));

                // Limpeza de arquivo
                if (dados.caminhoAnexo && fs.existsSync(dados.caminhoAnexo)) {
                    fs.unlinkSync(dados.caminhoAnexo);
                }

                canal.ack(msg);

            } catch (err) {
                console.error(`[❌] Erro no envio:`, err.message);
                setTimeout(() => canal.nack(msg), 10000);
            }
        });
    } catch (e) {
        console.error("[🚨] Erro de conexão:", e.message);
        setTimeout(iniciarWorker, 5000);
    }
}

iniciarWorker();

