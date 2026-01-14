require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const amqp = require('amqplib');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
/** Configuração do Multer: Define a pasta onde os currículos serão salvos temporariamente */
const upload = multer({ dest: 'uploads/' });

// --- MIDDLEWARES ---
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve os arquivos estáticos do Dashboard (HTML/CSS/JS)

/** URL de conexão com o Message Broker (CloudAMQP) */
const CLOUD_AMQP_URL = process.env.AMQP_URL;

// --- ROTAS DA API ---

/**
 * GET /status
 * Lê o arquivo de log gerado pelo Logger.js e retorna o histórico em formato JSON.
 */
app.get('/status', (req, res) => {
    const logPath = path.join(__dirname, 'relatorio_envios.txt');
    if (fs.existsSync(logPath)) {
        const logs = fs.readFileSync(logPath, 'utf8')
            .split('\n')
            .filter(line => line.trim() !== "");
        res.json(logs);
    } else {
        res.json(["Nenhum envio registrado ainda."]);
    }
});

/**
 * POST /enviar
 * Processa o formulário de candidatura e despacha os dados para a fila do RabbitMQ.
 */
app.post('/enviar', (req, res) => {
    // Processamento assíncrono do arquivo via Multer
    upload.single('curriculo')(req, res, async (err) => {
        if (err) {
            return res.status(500).send('Erro interno no processamento do anexo.');
        }

        // Validação obrigatória: Impede o fluxo sem o arquivo PDF/Doc
        if (!req.file) {
            return res.status(400).send('Erro: O arquivo de currículo é obrigatório.');
        }

        // CAPTURA DOS CAMPOS (Incluindo o novo campo 'candidato')
        const { nome, email, vaga, candidato } = req.body;

        // Verificação de infraestrutura
        if (!CLOUD_AMQP_URL) {
            return res.status(500).send('Erro: Servidor de mensageria não configurado.');
        }

        try {
            // Conexão com a Fila (AMQP Protocol)
            const conexao = await amqp.connect(CLOUD_AMQP_URL);
            const canal = await conexao.createChannel();
            await canal.assertQueue('fila_envios', { durable: true });

            // Preparação do payload para o Worker-Sender
            // 'nome' continua sendo a Empresa para o Log
            // 'candidato' vai para o corpo do e-mail
            const msg = JSON.stringify({
                nome: nome, 
                candidato: candidato || "Candidato", // Fallback caso venha vazio
                email: email, 
                vaga: vaga,
                caminhoAnexo: path.resolve(req.file.path),
                nomeAnexo: req.file.originalname
            });

            // Envio persistente para garantir que a mensagem não se perca
            canal.sendToQueue('fila_envios', Buffer.from(msg), { persistent: true });

            // Fechamento gracioso da conexão
            setTimeout(async () => {
                await conexao.close();
            }, 500);

            if (process.env.NODE_ENV === 'test') {
                return res.status(200).json({ message: 'OK' });
            }

            // Redireciona de volta para o Dashboard
            res.redirect('/');
        } catch (error) {
            console.error('Falha crítica na conexão AMQP:', error.message);
            res.status(500).send('Erro de Conexão com o provedor de mensagens.');
        }
    });
});

// --- INICIALIZAÇÃO DO SERVIDOR ---
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    if (process.env.NODE_ENV !== 'test') {
        console.log(`🌐 Dashboard rodando em http://localhost:${PORT}`);
    }
});

module.exports = { app, server };

