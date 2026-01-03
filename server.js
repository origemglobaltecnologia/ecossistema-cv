require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env
const express = require('express');
const bodyParser = require('body-parser');
const amqp = require('amqplib');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// URL agora obtida de forma segura via variável de ambiente
const CLOUD_AMQP_URL = process.env.AMQP_URL;

app.get('/status', (req, res) => {
    const logPath = path.join(__dirname, 'relatorio_envios.txt');
    if (fs.existsSync(logPath)) {
        const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(line => line.trim() !== "");
        res.json(logs);
    } else {
        res.json(["Nenhum envio registrado ainda."]);
    }
});

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
        await canal.assertQueue('fila_envios', { durable: true });

        const msg = JSON.stringify({ 
            nome, 
            email, 
            vaga, 
            caminhoAnexo: path.resolve(arquivoPath),
            nomeAnexo: arquivoNome 
        });
        
        canal.sendToQueue('fila_envios', Buffer.from(msg), { persistent: true });

        setTimeout(() => { conexao.close(); }, 500);
        res.redirect('/');
    } catch (err) {
        res.status(500).send('Erro de Conexão: ' + err.message);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 Dashboard rodando em http://localhost:${PORT}`));

