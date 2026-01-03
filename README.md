# 🚀 Ecossistema de Envio de Currículos

Sistema automatizado para gestão e envio de candidaturas, utilizando uma arquitetura baseada em eventos.

## 🛠️ Tecnologias
- **Frontend**: HTML5/CSS3 (Dashboard Responsivo)
- **Backend**: Node.js & Express
- **Mensageria**: RabbitMQ (CloudAMQP)
- **Email**: Nodemailer & Mailtrap (Ambiente de Teste)

## 🏗️ Estrutura
- `server.js`: API e interface web que recebe os arquivos (PDF).
- `worker-sender.js`: Processa a fila de e-mails e envia os anexos.
- `logger.js`: Monitora o sucesso dos envios e gera relatórios automáticos.

