/**
 * @file server.test.js
 * @description Testes de unidade para validação da integridade do servidor Express.
 * Verifica se as rotas base e o carregamento do dashboard estão operantes.
 */

const request = require('supertest');
/** * Importamos o app e o server reais. 
 * O server é importado para que possamos fechá-lo corretamente após os testes.
 */
const { app, server } = require('../server');

describe('Teste de Integridade do Servidor', () => {

  /**
   * @description Gancho executado após todos os testes da suíte.
   * Garante que o processo do servidor seja encerrado, evitando que o Jest fique "preso".
   */
  afterAll(async () => {
    await server.close();
  });

  /**
   * @test Verifica a rota raiz (/)
   * Objetivo: Confirmar se o servidor está servindo arquivos estáticos ou respondendo à rota inicial.
   */
  it('Deve carregar a página inicial (Dashboard) com status 200', async () => {
    const res = await request(app).get('/');
    
    // O status 200 confirma que o Express encontrou o arquivo ou a rota
    expect(res.statusCode).toEqual(200);
  });

  /**
   * @test Verifica a rota de status (/status)
   * Objetivo: Garantir que o endpoint de logs está acessível para o front-end.
   */
  it('Deve responder ao endpoint de status com um JSON', async () => {
    const res = await request(app).get('/status');
    
    expect(res.statusCode).toEqual(200);
    // Verificamos se o conteúdo retornado é um Array (de logs)
    expect(Array.isArray(res.body)).toBe(true);
  });
});

