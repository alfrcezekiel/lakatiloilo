import { ADMIN_ID } from '../fixtures/people';

// A pretend, EMPTY database for the API tests. It stands in for TypeORM's
// DataSource, so the tests never connect to the hosted Supabase database.
//
// - Every list comes back empty and every "find one" finds nothing, so an
//   unknown id ends in the backend's own 404 sentence.
// - Any chain of query-builder calls works (createQueryBuilder().where()
//   .orderBy()…), and ends in one of the empty answers below.
// - Inside a traveler transaction it remembers who is asking (from
//   set_config('request.jwt.claims', …)) and answers is_admin() with true
//   only for the pretend admin, like the real admins table would.
//
// It is for refusal and "empty" tests. Tests that need rows should add a
// fixture and a small, explicit fake for that one service instead.

const EMPTY_ANSWERS: Record<string, () => unknown> = {
  getMany: () => [],
  getRawMany: () => [],
  getOne: () => null,
  getRawOne: () => undefined,
  getCount: () => 0,
  getManyAndCount: () => [[], 0],
  getRawAndEntities: () => ({ raw: [], entities: [] }),
  find: () => [],
  findBy: () => [],
  findAndCount: () => [[], 0],
  findOne: () => null,
  findOneBy: () => null,
  count: () => 0,
  countBy: () => 0,
  exists: () => false,
  existsBy: () => false,
  query: () => [],
  execute: () => ({ raw: [], affected: 0 }),
  update: () => ({ raw: [], affected: 0 }),
  delete: () => ({ raw: [], affected: 0 }),
  softDelete: () => ({ raw: [], affected: 0 }),
  // Lifecycle calls a QueryRunner gets.
  connect: () => undefined,
  release: () => undefined,
  startTransaction: () => undefined,
  commitTransaction: () => undefined,
  rollbackTransaction: () => undefined,
};

// Something you can call, chain or read anything from, which always leads
// back to itself until it reaches one of the empty answers above.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function emptyChain(overrides: Record<string, unknown> = {}): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = new Proxy(function pretendDatabase() {}, {
    get(_target, prop) {
      if (typeof prop === 'symbol' || prop === 'then') return undefined;
      if (prop in overrides) return overrides[prop];
      if (prop in EMPTY_ANSWERS) return async () => EMPTY_ANSWERS[prop]();
      if (prop === 'isTransactionActive') return false;
      if (prop === 'isReleased') return false;
      return chain;
    },
    apply: () => chain,
  });
  return chain;
}

// One pretend database connection for one traveler transaction.
function pretendRunner() {
  let askingAs: string | null = null;
  const query = async (sql: string, params: unknown[] = []) => {
    if (sql.includes("set_config('request.jwt.claims'")) {
      askingAs = (JSON.parse(String(params[0])) as { sub: string }).sub;
      return [{}];
    }
    if (sql.includes('is_admin()')) return [{ is_admin: askingAs === ADMIN_ID }];
    return [];
  };
  return emptyChain({ query, manager: emptyChain({ query }) });
}

export const fakeDataSource = () =>
  emptyChain({
    options: { type: 'postgres' },
    createQueryRunner: () => pretendRunner(),
    transaction: async (work: (manager: unknown) => unknown) => work(emptyChain()),
    manager: emptyChain(),
  });
