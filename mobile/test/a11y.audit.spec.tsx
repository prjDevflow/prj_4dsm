import { render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text, TextInput, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { renderRouter } from 'expo-router/testing-library';
import { http, HttpResponse } from 'msw';
import { useSessionStore } from '@/context/SessionStore';
import { TOKEN_KEY } from '@/context/tokenStorage';
import type { Usuario } from '@/lib/types/auth';
import {
  FakeAccessEventDirectory,
  sampleAccessEvents,
} from '@/service/fakes/FakeAccessEventDirectory';
import { FakeAuthorizationDirectory } from '@/service/fakes/FakeAuthorizationDirectory';
import { FakeLocationDirectory } from '@/service/fakes/FakeLocationDirectory';
import { FakeNfcTagDirectory } from '@/service/fakes/FakeNfcTagDirectory';
import { FakeUserDirectory } from '@/service/fakes/FakeUserDirectory';
import { sampleAdmin, sampleCondomino } from '@/service/fakes/sampleData';
import { accessEventsHandlers } from '@test/msw/accessEventsHandlers';
import { authorizationsHandlers } from '@test/msw/authorizationsHandlers';
import { API_URL } from '@test/msw/handlers';
import { locationsHandlers } from '@test/msw/locationsHandlers';
import { nfcTagsHandlers } from '@test/msw/nfcTagsHandlers';
import { server } from '@test/msw/server';
import { usersHandlers } from '@test/msw/usersHandlers';

// F14: every screen of the app, opened by its real route, is read the way a screen reader reads it.
// Everything that reacts to a tap needs a role (what it does) and a name (what it is), and every
// text field needs a name. The size of the touch areas and the text at 200% are checked on the
// emulator, because Jest has no layout.
jest.setTimeout(30_000);

type HostNode = {
  type: string;
  props: Record<string, unknown>;
  children: (HostNode | string)[];
};

const ROLES = new Set([
  'button',
  'link',
  'switch',
  'checkbox',
  'radio',
  'tab',
  'combobox',
  'search',
  'adjustable',
  'menuitem',
  'togglebutton',
  'imagebutton',
]);

const hidden = (node: HostNode) =>
  node.props.importantForAccessibility === 'no-hide-descendants' ||
  node.props.accessibilityElementsHidden === true ||
  node.props['aria-hidden'] === true;

const textOf = (node: HostNode | string): string =>
  typeof node === 'string'
    ? node
    : hidden(node)
      ? ''
      : node.children.map(textOf).join(' ').replace(/\s+/g, ' ').trim();

const nameOf = (node: HostNode) =>
  String(node.props.accessibilityLabel ?? node.props['aria-label'] ?? textOf(node)).trim();

const touchable = (node: HostNode) =>
  typeof node.props.onClick === 'function' || typeof node.props.onResponderRelease === 'function';

// A name that reads as code: an icon name ("qr_code_scanner"), a reason code or an id.
const TECHNICAL = /[a-z]+_[a-z_]+|[A-Z]{3,}_[A-Z_]+|[0-9a-f]{8}-[0-9a-f]{4}-/;

/** Lists what a screen reader could not announce with a name and a role. */
const auditTree = (root: HostNode) => {
  const problems: string[] = [];
  let checked = 0;
  const walk = (node: HostNode | string) => {
    if (typeof node === 'string' || hidden(node)) return;
    const label = node.props.accessibilityLabel ?? node.props['aria-label'];
    if (node.type === 'TextInput' && !String(label ?? '').trim()) {
      problems.push(`campo sem nome (placeholder "${String(node.props.placeholder ?? '')}")`);
    }
    if (touchable(node) && node.props.accessible !== false) {
      const role = String(node.props.accessibilityRole ?? node.props.role ?? '');
      const name = nameOf(node);
      if (!ROLES.has(role)) problems.push(`"${name || '?'}" sem função (role "${role}")`);
      if (!name) problems.push(`elemento "${role}" sem nome`);
      if (TECHNICAL.test(name)) problems.push(`"${name}" lido como código`);
      checked += 1;
    }
    node.children.forEach(walk);
  };
  walk(root);
  return { problems, checked };
};

/** The screen on display: nothing left without a name or a role, and something was checked. */
const auditScreen = () => {
  const { problems, checked } = auditTree(screen.root as unknown as HostNode);
  expect(checked).toBeGreaterThan(0);
  return problems;
};

const users = () => new FakeUserDirectory();

const useApi = () => {
  const people = users();
  const locations = new FakeLocationDirectory();
  const authorizations = new FakeAuthorizationDirectory({ users: people, locations });
  const tags = new FakeNfcTagDirectory({ withSamples: true });
  server.use(
    ...usersHandlers(people, sampleAdmin.id),
    ...locationsHandlers(locations),
    ...authorizationsHandlers(authorizations, sampleAdmin),
    ...nfcTagsHandlers(tags),
    ...accessEventsHandlers(new FakeAccessEventDirectory(sampleAccessEvents()), sampleCondomino.id),
  );
  return { people, locations, authorizations, tags };
};

const openAs = async (usuario: Usuario | null, url: string) => {
  if (usuario) {
    await SecureStore.setItemAsync(TOKEN_KEY, `token-${usuario.perfil}`);
    server.use(http.get(`${API_URL}/auth/me`, () => HttpResponse.json(usuario)));
  }
  // Same trick as navigation.spec: the first token read waits for the real timers.
  const getItem = SecureStore.getItemAsync as jest.Mock;
  const readToken = getItem.getMockImplementation()!;
  let release = () => {};
  const back = new Promise<void>((resolve) => {
    release = resolve;
  });
  getItem.mockImplementationOnce(async (key: string) => {
    await back;
    return readToken(key);
  });
  await renderRouter('src/app', { initialUrl: url });
  jest.useRealTimers();
  release();
};

const settle = async (header: RegExp) => {
  await screen.findAllByRole('header', { name: header }, { timeout: 8000 });
  // Lists and selects load after the header; wait until no spinner is left.
  await waitFor(() => expect(screen.queryAllByText(/^Carregando/)).toHaveLength(0), {
    timeout: 8000,
  });
};

beforeEach(async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  useSessionStore.setState({ token: null, usuario: null, expired: false });
});

describe('o auditor do leitor de tela (F14)', () => {
  it('aponta o toque sem nome, sem função, o nome em código e o campo sem nome', async () => {
    await render(
      <View>
        <Pressable onPress={() => {}} />
        <Pressable onPress={() => {}}>
          <Text>Sem função</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="qr_code_scanner"
          onPress={() => {}}
        />
        <TextInput placeholder="Digite" />
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Pressable onPress={() => {}} />
        </View>
        <Pressable accessibilityRole="button" onPress={() => {}}>
          <Text>Entrar</Text>
        </Pressable>
      </View>,
    );

    expect(auditTree(screen.root as unknown as HostNode)).toEqual({
      checked: 4,
      problems: [
        '"?" sem função (role "")',
        'elemento "" sem nome',
        '"Sem função" sem função (role "")',
        '"qr_code_scanner" lido como código',
        'campo sem nome (placeholder "Digite")',
      ],
    });
  });
});

describe('auditoria do leitor de tela em todas as telas (F14)', () => {
  it('login: campos e botões têm nome e função', async () => {
    await openAs(null, '/login');
    await screen.findByLabelText('E-mail', {}, { timeout: 8000 });

    expect(auditScreen()).toEqual([]);
  });

  it.each([
    ['/', /^Olá/],
    ['/me/authorizations', /Minhas autorizações/],
    ['/me/history', /Meu histórico/],
    ['/me/account', /Minha conta/],
    ['/access/scanner', /QR Code|câmera/i],
  ])('pessoa, %s: tudo é anunciado com nome e função', async (url, header) => {
    useApi();
    await openAs(sampleCondomino, url);
    if (url === '/access/scanner') {
      await screen.findByRole('button', { name: 'Voltar' }, { timeout: 8000 });
    } else {
      await settle(header);
    }

    expect(auditScreen()).toEqual([]);
  });

  it.each([
    ['/', /Administração/],
    ['/admin/users', /Usuários/],
    ['/admin/users/new', /Novo usuário/],
    ['/admin/locations', /Locais e terminais/],
    ['/admin/locations/buildings/new', /Novo edifício/],
    ['/admin/locations/points/new', /Novo local/],
    ['/admin/terminals', /Terminais/],
    ['/admin/terminals/new', /Novo terminal/],
    ['/admin/authorizations', /Autorizações/],
    ['/admin/authorizations/new', /Nova autorização/],
    ['/admin/history', /Histórico/],
    ['/admin/tags', /Tags NFC/],
    ['/admin/tags/new', /Vincular tag/],
    ['/admin/tags/enroll', /Ler tag/],
    ['/me/account', /Minha conta/],
  ])('administrador, %s: tudo é anunciado com nome e função', async (url, header) => {
    useApi();
    await openAs(sampleAdmin, url);
    await settle(header);

    expect(auditScreen()).toEqual([]);
  });

  it.each(['users', 'authorizations', 'terminals', 'tags'] as const)(
    'administrador, detalhe de %s: tudo é anunciado com nome e função',
    async (area) => {
      const api = useApi();
      const id = {
        users: () => api.people.list({ page: 1, pageSize: 1 }).data[0].id,
        authorizations: () => api.authorizations.list({ page: 1, pageSize: 1 }).data[0].id,
        terminals: () => api.locations.listTerminals({ page: 1, pageSize: 1 }).data[0].id,
        tags: () => api.tags.list({ page: 1, pageSize: 1 }).data[0].id,
      }[area]();
      await openAs(sampleAdmin, `/admin/${area}/${id}`);
      await screen.findAllByRole('button', { name: 'Voltar' }, { timeout: 8000 });
      await waitFor(() => expect(screen.queryAllByText(/^Carregando/)).toHaveLength(0), {
        timeout: 8000,
      });

      expect(auditScreen()).toEqual([]);
    },
  );
});
