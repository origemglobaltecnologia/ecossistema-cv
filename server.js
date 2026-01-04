/**
 * @file server.js
 * @description Servidor API que gerencia o recebimento de currículos e 
 * encaminha os dados para processamento assíncrono via RabbitMQ.
 */

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const amqp = require('amqplib');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();

/**
 * Configuração do Multer para armazenamento temporário de uploads.
 */
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const CLOUD_AMQP_URL = process.env.AMQP_URL;

/**
 * Retorna o histórico de envios processados a partir do arquivo de log.
 */
app.get('/status', (req, res) => {
    const logPath = path.join(__dirname, 'relatorio_envios.txt');
    if (fs.existsSync(logPath)) {
        const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(line => line.trim() !== "");
        res.json(logs);
    } else {
        res.json(["Nenhum envio registrado ainda."]);
    }
});

/**
 * Processa o formulário de candidatura, salva o anexo e publica na fila de mensagens.
 */
app.post('/enviar', upload.single('curriculo'), async (req, res) => {
    const { nome, email, vaga } = req.body;
    const arquivoPath = req.file ? req.file.path : null;
    const arquivoNome = req.file ? req.file.originalname : null;

    if (!CLOUD_AMQP_URL) {
        return res.status(500).send('Erro: Configuração AMQP_URL não encontrada no servidor.');
    }

    try {
        const conexao = await amqp.connect(CLOUD_AMQP_URL);
        const canal = await conexao.createChannel();
        
        // Assegura que a fila de envios existe e é resiliente
        await canal.assertQueue('fila_envios', { durable: true });

        const msg = JSON.stringify({ 
            nome, 
            email, 
            vaga, 
            caminhoAnexo: path.resolve(arquivoPath),
            nomeAnexo: arquivoNome 
        });
        
        // Envia a mensagem com persistência para evitar perda de dados
        canal.sendToQueue('fila_envios', Buffer.from(msg), { persistent: true });

        setTimeout(() => { conexao.close(); }, 500);
        res.redirect('/');
    } catch (err) {
        console.error('Erro no processamento AMQP:', err.message);
        res.status(500).send('Erro de Conexão: ' + err.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Dashboard rodando em http://localhost:${PORT}`));

