# 🚀 Ecossistema de Recrutamento Automatizado (CV-Sender)

Este é um ecossistema robusto baseado em micro-serviços para gestão de candidaturas. Ele utiliza uma arquitetura orientada a eventos com **Node.js** e **RabbitMQ** para processar envios de currículos de forma assíncrona, garantindo alta disponibilidade e resiliência.



## 🛠️ Tecnologias Utilizadas

* **Runtime:** Node.js (v18+)
* **Framework Web:** Express.js
* **Mensageria:** RabbitMQ (via CloudAMQP)
* **Uploads:** Multer
* **E-mail:** Nodemailer
* **Testes:** Jest & Supertest

---

## 🏗️ Arquitetura do Sistema

O sistema é dividido em três componentes principais que operam de forma independente:

1.  **Server (API):** Recebe o formulário e o arquivo PDF, valida os dados e coloca uma mensagem na fila `fila_envios`.
2.  **Worker-Sender:** Consome as mensagens da fila e realiza o envio real do e-mail com anexo.
3.  **Logger:** Monitora a fila para registrar cada evento de sucesso em um relatório persistente e dashboard HTML.

---

## 🧪 Estratégia de Testes

O projeto conta com uma suíte de testes automatizados que garante a integridade de cada etapa do fluxo.

### Cobertura de Testes:
* **Unitários:** Validação de rotas e middlewares.
* **Integração:** Simulação de upload de arquivos reais e comunicação com Mock do RabbitMQ.
* **Workers:** Validação da lógica de formatação de e-mails e anexos.

Para rodar os testes:
```bash
npm test
---
🚀 Como Executar
​1. Requisitos Próvios
​Crie um arquivo .env na raiz com as seguintes chaves:

PORT=3000
AMQP_URL=sua_url_do_cloudamqp
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app
EMAIL_DESTINO=rh@empresa.com

2. Instalação
npm install

3. Iniciando os Serviços
​Recomenda-se abrir três terminais (ou abas no Termux):
​Terminal 1 (Dashboard): npm start
​Terminal 2 (Processador): npm run worker
​Terminal 3 (Relatórios): npm run logger
​🧹 Manutenção Automática
​O sistema possui rotinas de higiene de arquivos:
​A pasta uploads/ é limpa automaticamente toda vez que o servidor inicia.
​Os arquivos temporários gerados durante os testes são removidos imediatamente após a execução da suíte de testes.
​📈 Próximos Passos
​[ ] Implementar Teste de Carga para medir latência da fila.
​[ ] Adicionar suporte para armazenamento em nuvem (AWS S3) para os currículos.
​[ ] Criar interface visual para monitoramento em tempo real dos workers.
​© 2024 - Desenvolvido por [Cristiano/Origem Global Tecnologia]


