import request from 'supertest';
import app from '../src/index';
import { setupTestDatabase, teardownTestDatabase, seedTestDatabase, mockAuthentication } from '../src/utils/testUtils';
import { Server } from 'http';

let server: Server;
let port: number;

beforeAll(async () => {
  mockAuthentication(app); // Ensure this is applied first
  await setupTestDatabase();
  await seedTestDatabase();
  port = Math.floor(Math.random() * 10000) + 3000; // Assign a random port
  server = app.listen(port); // Start the server on a dynamic port
});

afterAll(async () => {
  await teardownTestDatabase();
  server.close(); // Close the server to free the port
});

describe('Estabelecimento Controller', () => {
  describe('POST /api/estabelecimentos/avaliar', () => {
    it('should create a new evaluation for an establishment', async () => {
      const response = await request(app)
        .post('/api/estabelecimentos/avaliar')
        .send({
          estabelecimentoId: 2,
          nota: 5,
          comentario: 'Excelente!'
        })
        .set('Authorization', 'Bearer valid-token');

      console.log(response.body); // Log the response body for debugging

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.nota).toBe(5);
      expect(response.body.comentario).toBe('Excelente!');
    });
  });

  describe('GET /api/estabelecimentos/:estabelecimentoId/avaliacoes', () => {
    it('should fetch evaluations for a specific establishment', async () => {
      const response = await request(app)
        .get('/api/estabelecimentos/2/avaliacoes')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
