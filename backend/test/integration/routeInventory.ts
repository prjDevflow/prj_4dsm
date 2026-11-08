import { buildApiRouter } from '../../src/main/routes';

export type HttpMethod = 'get' | 'post' | 'patch' | 'put' | 'delete';

export interface RegisteredRoute {
  method: HttpMethod;
  /** As registered in Express, relative to /api/v1 (for example `/users/:id`). */
  path: string;
}

// The part of Express's router internals this file reads. Express does not export a type for them.
interface RouterLayer {
  route?: { path: string; methods: Record<string, boolean> };
  handle?: { stack?: RouterLayer[] };
}

function collect(stack: RouterLayer[], found: RegisteredRoute[]) {
  for (const layer of stack) {
    if (layer.route) {
      for (const method of Object.keys(layer.route.methods)) {
        found.push({ method: method as HttpMethod, path: layer.route.path });
      }
    } else if (layer.handle?.stack) {
      collect(layer.handle.stack, found);
    }
  }
}

/** Every route the API registers, read from the real router: a new route shows up here by itself. */
export function listRegisteredRoutes(): RegisteredRoute[] {
  const found: RegisteredRoute[] = [];
  // buildApiRouter() is a Router, i.e. a function that carries its layers in `stack`.
  collect((buildApiRouter() as unknown as { stack: RouterLayer[] }).stack, found);
  return found;
}

export const routeKey = ({ method, path }: RegisteredRoute) => `${method.toUpperCase()} ${path}`;

/** `/users/:id` as OpenAPI writes it: `/users/{id}`. */
export const toOpenApiPath = (path: string) => path.replace(/:(\w+)/g, '{$1}');
