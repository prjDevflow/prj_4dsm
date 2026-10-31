import { createServices } from './container';
import { FakeGetHealthService } from './fakes/FakeGetHealthService';
import { GetHealthService } from './implementations/GetHealthService';

describe('createServices', () => {
  it('usa o serviço real quando ele não está na lista de falsos', () => {
    expect(createServices([]).getHealth).toBeInstanceOf(GetHealthService);
  });

  it('usa o falso quando o nome está na lista de falsos', () => {
    expect(createServices(['getHealth']).getHealth).toBeInstanceOf(FakeGetHealthService);
  });
});
