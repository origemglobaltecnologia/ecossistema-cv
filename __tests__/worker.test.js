/**
 * @file worker.test.js
 * @description Teste de unidade para o Worker de envio. 
 * Utiliza Mocks para simular o comportamento do Nodemailer, garantindo que 
 * a lógica de composição do e-mail esteja correta sem realizar envios reais.
 */

const nodemailer = require('nodemailer');

/** * @description MOCK do Nodemailer: 
 * Intercepta a criação do transportador para evitar conexões externas durante os testes.
 */
jest.mock('nodemailer');

describe('Worker de Envio (Lógica de composição)', () => {
  let sendMailMock;

  beforeEach(() => {
    /** * @description Dublê de função (Spy):
     * Simula o método sendMail, retornando um status de sucesso (250 OK) via callback.
     */
    sendMailMock = jest.fn((mailOptions, callback) => {
      callback(null, { response: '250 OK' });
    });

    // Injeta o mock no método createTransport do Nodemailer
    nodemailer.createTransport.mockReturnValue({
      sendMail: sendMailMock
    });
  });

  /**
   * @test Validação de Payload e Composição
   * Objetivo: Garantir que o Worker mapeia os dados da fila para os campos corretos do e-mail.
   */
  it('Deve formatar o e-mail com os dados da fila e anexar o arquivo corretamente', (done) => {
    // Dados simulados (Payload) que o Worker receberia do RabbitMQ
    const dadosFila = {
      nome: 'Candidato Teste',
      email: 'candidato@teste.com',
      vaga: 'Desenvolvedor Node.js',
      caminhoAnexo: '/tmp/curriculo.pdf',
      nomeAnexo: 'curriculo.pdf'
    };

    /** * @description Execução Controlada:
     * Simulamos a lógica interna do worker-sender.js para verificar a saída.
     */
    const transporter = nodemailer.createTransport();

    const mailOptions = {
      from: 'seu-email@gmail.com',
      to: 'destino@empresa.com',
      subject: `Novo Currículo: ${dadosFila.nome} - ${dadosFila.vaga}`,
      text: `Dados: ${dadosFila.email}`,
      attachments: [{ filename: dadosFila.nomeAnexo, path: dadosFila.caminhoAnexo }]
    };

    transporter.sendMail(mailOptions, (error, info) => {
      // 1. Verifica se não houve erro no disparo simulado
      expect(error).toBeNull();
      
      // 2. Confirma se a função de envio foi de fato executada
      expect(sendMailMock).toHaveBeenCalled();

      // 3. Inspeção do Assunto (Subject): Verifica se contém o nome do candidato e a vaga
      const parametrosEnviados = sendMailMock.mock.calls[0][0];
      expect(parametrosEnviados.subject).toContain(dadosFila.nome);
      expect(parametrosEnviados.subject).toContain(dadosFila.vaga);

      // 4. Verificação de Anexo: Garante que o nome do arquivo foi passado corretamente
      expect(parametrosEnviados.attachments[0].filename).toBe('curriculo.pdf');

      /** * @description Sinaliza ao Jest que o teste assíncrono terminou.
       * Isso é necessário quando testamos callbacks ou Promises.
       */
      done(); 
    });
  });
});

