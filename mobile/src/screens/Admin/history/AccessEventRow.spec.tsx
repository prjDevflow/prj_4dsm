import { render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { sampleAccessEvents } from '@/service/fakes/FakeAccessEventDirectory';
import { AccessEventRow } from './AccessEventRow';

const [event] = sampleAccessEvents(new Date('2026-10-24T18:00:00Z'));

const withFontScale = (fontScale: number) => {
  const window = Dimensions.get('window');
  jest.spyOn(Dimensions, 'get').mockReturnValue({ ...window, fontScale });
};

describe('AccessEventRow', () => {
  afterEach(() => jest.restoreAllMocks());

  it('com a fonte normal, o nome e a hora dividem a linha', async () => {
    withFontScale(1);
    await render(<AccessEventRow event={event} perspective="admin" onPress={jest.fn()} />);

    expect(screen.getByTestId('access-event-top')).toHaveStyle({ flexDirection: 'row' });
  });

  it('com a fonte em 200%, a hora desce para baixo do nome, que não quebra no meio', async () => {
    withFontScale(2);
    await render(<AccessEventRow event={event} perspective="admin" onPress={jest.fn()} />);

    expect(screen.getByTestId('access-event-top')).toHaveStyle({ flexDirection: 'column' });
  });
});
