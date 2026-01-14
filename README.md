# 📬 Ecosistema CV SMTP

Sistema automatizado para envio de currículos via e-mail utilizando **Node.js**, **RabbitMQ (AMQP)** e **SMTP (Nodemailer)**, com arquitetura baseada em **microserviços desacoplados**.

Projeto desenvolvido como parte de portfólio Full Stack, demonstrando mensageria, filas persistentes, workers assíncronos e logging distribuído.

---

## 🧱 Arquitetura

O ecossistema é composto por três processos independentes:

- **Servidor Web (Dashboard)**
  - Recebe os currículos via formulário
  - Enfileira as mensagens no RabbitMQ

- **Worker SMTP**
  - Consome a fila de envios
  - Dispara e-mails HTML profissionais com anexo

- **Logger**
  - Registra eventos de envio
  - Persiste histórico para visualização no Dashboard

```
[ Cliente ] → [ Express ] → [ RabbitMQ ] → [ Worker SMTP ]
                                      ↘︎ [ Logger ]
```

---

## 🚀 Requisitos

- Node.js **18+**
- NPM ou Yarn
- Conta no **CloudAMQP** (ou RabbitMQ local)
- Conta de e-mail SMTP (ex: Gmail)

---

## 📦 Instalação

```bash
git clone https://github.com/origemglobaltecnologia/ecossistema-cv.git
cd ecosistema-cv-smtp
npm install
```

---

## ⚙️ Configuração do `.env`

Crie um arquivo `.env` na raiz do projeto:

```env
# Mensageria (RabbitMQ / CloudAMQP)
AMQP_URL=amqps://usuario:senha@host/vhost

# Configurações SMTP (Gmail recomendado)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=seu_email@gmail.com
EMAIL_PASS=sua_senha_de_app

# Servidor
PORT=3000
NODE_ENV=development
```

> ⚠️ **IMPORTANTE:**  
> Para Gmail, utilize **Senha de App**, não a senha normal da conta.

---

## ▶️ Execução

### 1️⃣ Iniciar o servidor (Dashboard)

```bash
npm start
```

Acesse:
```
http://localhost:3000
```

---

### 2️⃣ Iniciar o Worker de Envio

```bash
npm run worker
```

---

### 3️⃣ Iniciar o Logger

```bash
npm run logger
```

---



### ▶️ Inicialização automática com `iniciar.sh` (opcional)

Para iniciar **todos os módulos do sistema automaticamente** (Dashboard, Worker SMTP e Logger), utilize o script:

```bash
chmod +x iniciar.sh
./iniciar.sh
```

O script executará todos os serviços necessários em sequência.

## 📊 Monitoramento

- Endpoint de status:
```
GET /status
```

- Histórico salvo em:
```
relatorio_envios.txt
```

---

## 🧪 Testes

```bash
npm test
```

---

## 🔐 Segurança

O arquivo `.env` **não deve ser versionado**.

Adicione ao `.gitignore`:

```
.env
uploads/*
!uploads/.gitkeep
```

---

## 🧠 Tecnologias

- Node.js
- Express
- RabbitMQ (AMQP)
- Nodemailer (SMTP)
- Multer
- Jest
- Supertest

---

## 👨‍💻 Autor

**Cristiano Origem Camejo**  
📂 https://github.com/origemglobaltecnologia

---

## 📜 Licença

ISC