/**
 * @file upload.test.js
 * @description Testes de integração para o fluxo de upload e mensageria.
 * Valida desde a recepção de arquivos pelo Multer até o despacho para a fila RabbitMQ.
 */

const request = require('supertest');
const amqp = require('amqplib');
const fs = require('fs');
const path = require('path');

/** * @description Mock do AMQP: Intercepta a conexão com o RabbitMQ.
 * Essencial para rodar testes em ambientes sem internet ou sem o Broker ativo.
 */
jest.mock('amqplib');

// Importação do app e server reais após a definição do mock
const { app, server } = require('../server');

describe('Fluxo de Candidatura (Upload & AMQP)', () => {

  /**
   * @description Configuração prévia dos Mocks.
   * Define o comportamento esperado para a conexão, canal e filas.
   */
  beforeAll(() => {
    amqp.connect.mockResolvedValue({
      createChannel: jest.fn().mockResolvedValue({
        assertQueue: jest.fn().mockResolvedValue(true),
        sendToQueue: jest.fn().mockResolvedValue(true),
      }),
      close: jest.fn().mockResolvedValue(true),
    });
  });

  /**
   * @description Limpeza pós-teste.
   * Encerra o servidor e remove qualquer arquivo residual para manter o ambiente limpo.
   */
  afterAll(async () => {
    // 1. Encerra a escuta da porta para liberar o processo do Jest
    await server.close();

    // 2. Faxina na pasta uploads: Remove arquivos criados pelo Multer durante os testes
    const uploadsDir = path.join(__dirname, '../uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file !== '.gitkeep') {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      }
    }

    // 3. Remove o arquivo de buffer usado para o teste de attach
    const tempFile = path.join(__dirname, 'test-cv.txt');
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  });

  /**
   * @test Validação de Erro 400
   * Objetivo: Garantir que o servidor rejeite requisições sem o arquivo obrigatório.
   */
  it('Deve retornar erro 400 se tentar enviar o formulário sem o arquivo', async () => {
    const res = await request(app)
      .post('/enviar')
      .send({ nome: 'Teste', email: 'teste@exemplo.com' });

    expect(res.statusCode).toEqual(400);
  });

  /**
   * @test Acessibilidade da Rota Raiz
   */
  it('Deve carregar a página inicial (Dashboard) com sucesso', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
  });

  /**
   * @test Integração de Sucesso (Upload + Fila)
   * Objetivo: Simular um envio completo de formulário multipart e verificar a integração.
   */
  it('Deve processar o upload e retornar OK quando o arquivo for anexado corretamente', async () => {
    // Criação de um arquivo físico temporário para o teste
    const filePath = path.join(__dirname, 'test-cv.txt');
    fs.writeFileSync(filePath, 'Conteúdo fictício para validação de stream de arquivo.');

    /**
     * Usamos .field() para dados de texto e .attach() para arquivos,
     * simulando exatamente o comportamento de um formulário HTML5.
     */
    const res = await request(app)
      .post('/enviar')
      .field('nome', 'Candidato Teste')
      .field('email', 'sucesso@teste.com')
      .field('vaga', 'Engenheiro de Dados')
      .attach('curriculo', filePath);

    // Verifica o status 200 (sucesso) e a mensagem configurada no server.js para testes
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('OK');

    // Higiene imediata: remove o arquivo de teste local
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });
});

