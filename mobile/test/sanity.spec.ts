import axios from 'axios';
import { API_URL } from '@test/msw/handlers';

describe('ambiente de testes', () => {
  it('responde o /health pelo MSW com o exemplo do contrato', async () => {
    const response = await axios.get(`${API_URL}/health`);

    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({ status: 'ok', db: 'up' });
  });
});
