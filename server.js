const express = require('express');
const bodyParser = require('body-parser');
const amqp = require('amqplib');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const upload = multer({ dest: 'uploads/' }); // Pasta temporária para currículos

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const CLOUD_AMQP_URL = 'amqps://ozzqvboe:HC7qH-SL9VjJgcuAxws8py-t-FlofO-n@jackal.rmq.cloudamqp.com/ozzqvboe';

app.get('/status', (req, res) => {
    const logPath = path.join(__dirname, 'relatorio_envios.txt');
    if (fs.existsSync(logPath)) {
        const logs = fs.readFileSync(logPath, 'utf8').split('\n').filter(line => line.trim() !== "");
        res.json(logs);
    } else {
        res.json(["Nenhum envio registrado ainda."]);
    }
});

// Rota atualizada para aceitar o PDF (campo 'curriculo')
app.post('/enviar', upload.single('curriculo'), async (req, res) => {
    const { nome, email, vaga } = req.body;
    const arquivoPath = req.file ? req.file.path : null;
    const arquivoNome = req.file ? req.file.originalname : null;

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
        res.status(500).send('Erro: ' + err.message);
    }
});

app.listen(3000, () => console.log('🌐 Dashboard com Upload em http://localhost:3000'));

