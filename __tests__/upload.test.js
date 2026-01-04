const request = require('supertest');
const amqp = require('amqplib');
const fs = require('fs');
const path = require('path');

// 1. Criamos o Mock ANTES de importar o app para interceptar a conexão RabbitMQ
jest.mock('amqplib');

// 2. Importamos o app e o server após o mock
const { app, server } = require('../server');

describe('Fluxo de Candidatura (Upload)', () => {

  beforeAll(() => {
    // Forçamos o amqplib a fingir que conectou com sucesso durante os testes
    amqp.connect.mockResolvedValue({
      createChannel: jest.fn().mockResolvedValue({
        assertQueue: jest.fn().mockResolvedValue(true),
        sendToQueue: jest.fn().mockResolvedValue(true),
      }),
      close: jest.fn().mockResolvedValue(true),
    });
  });

  afterAll(async () => {
    // Fecha o servidor para o Jest não deixar processos pendentes
    await server.close();
    
    // Limpeza: remove arquivo de teste residual se existir
    const tempFile = path.join(__dirname, 'test-cv.txt');
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  });

  it('Deve retornar erro 400 se tentar enviar sem arquivo', async () => {
    const res = await request(app)
      .post('/enviar')
      .send({ nome: 'Teste', email: 'teste@exemplo.com' });

    expect(res.statusCode).toEqual(400);
  });

  it('Deve carregar a página inicial', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
  });

  // TESTE DE SUCESSO: Simula o envio de um arquivo real
  it('Deve aceitar o envio quando um arquivo for anexado corretamente', async () => {
    const filePath = path.join(__dirname, 'test-cv.txt');
    fs.writeFileSync(filePath, 'Conteúdo fictício para teste de upload.');

    const res = await request(app)
      .post('/enviar')
      .field('nome', 'Candidato Teste')
      .field('email', 'sucesso@teste.com')
      .field('vaga', 'Engenheiro de Dados')
      .attach('curriculo', filePath);

    // Valida se o servidor respondeu 200 OK (comportamento para ambiente de teste)
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('OK');

    // Remove o arquivo temporário após o uso
    fs.unlinkSync(filePath);
  });
});

