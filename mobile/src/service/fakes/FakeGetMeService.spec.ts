import { useSessionStore } from '@/context/SessionStore';
import { FakeGetMeService } from './FakeGetMeService';
import { sampleLoginResponses, sampleVisitante } from './sampleData';

describe('FakeGetMeService', () => {
  it('no modo falso, reconhece o token do login falso e devolve o usuário do seed', async () => {
    useSessionStore.setState({
      token: sampleLoginResponses['visitante@dev.local'].response.accessToken,
    });

    await expect(new FakeGetMeService().exec()).resolves.toEqual(sampleVisitante);
  });

  it('token desconhecido responde 401, como a API', async () => {
    useSessionStore.setState({ token: 'token-que-nao-existe' });

    await expect(new FakeGetMeService().exec()).rejects.toMatchObject({ status: 401 });
  });
});
