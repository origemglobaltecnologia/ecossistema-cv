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

// --- MÓDULO DE MANUTENÇÃO ---
/**
 * Realiza a limpeza da pasta de uploads no startup do servidor.
 * Remove arquivos residuais de sessões anteriores para economizar espaço.
 */
const limparPastaUploads = () => {
    const diretorio = path.join(__dirname, 'uploads');
    if (fs.existsSync(diretorio)) {
        fs.readdirSync(diretorio).forEach(arquivo => {
            if (arquivo !== '.gitkeep') {
                fs.unlinkSync(path.join(diretorio, arquivo));
            }
        });
        if (process.env.NODE_ENV !== 'test') {
            console.log('🧹 Manutenção: Pasta uploads limpa com sucesso.');
        }
    }
};
limparPastaUploads();

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
 * Inclui lógica de pré-validação para suportar testes automatizados.
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

        const { nome, email, vaga } = req.body;

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
            const msg = JSON.stringify({
                nome, 
                email, 
                vaga,
                caminhoAnexo: path.resolve(req.file.path),
                nomeAnexo: req.file.originalname
            });

            // Envio persistente para garantir que a mensagem não se perca se o server cair
            canal.sendToQueue('fila_envios', Buffer.from(msg), { persistent: true });

            // Fechamento gracioso da conexão após curto delay
            setTimeout(async () => {
                await conexao.close();
            }, 500);

            // Resposta específica para o ambiente Jest/Test
            if (process.env.NODE_ENV === 'test') {
                return res.status(200).json({ message: 'OK' });
            }

            // Fluxo normal: Redireciona de volta para o Dashboard
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

/** Exportação para uso na suíte de testes (Supertest) */
module.exports = { app, server };

