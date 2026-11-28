import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { TravelerTransactions } from '../../src/v1/traveler-transactions';
import { FaqsService, faqChangesFrom, moveDirectionFrom } from '../../src/v1/faqs/faqs.service';
import { TOKENS } from '../fixtures/people';

// Tickets 168 and 169: the admin FAQs list, Add and Edit, with a pretend transaction (no hosted
// database). The refusals (no login 401, a traveler 403) are in
// refusals.e2e-spec.ts, which covers every /v1/admin route.

const ROWS = [
  { id: 'a', question: 'What is Lakat Iloilo?', answer: 'A site.', topic: 'about_platform', position: 1, is_shown: false, updated_at: '2026-11-28T10:00:00Z' },
];

async function setUp(answer: (sql: string) => unknown) {
  const seen: { token: string; sql: string[] } = { token: '', sql: [] };
  const testingModule = await Test.createTestingModule({
    providers: [
      FaqsService,
      // The backend's own login (the public list, ticket 170).
      {
        provide: getDataSourceToken(),
        useValue: { query: async (sql: string) => (seen.sql.push(sql), answer(sql)) },
      },
      {
        provide: TravelerTransactions,
        useValue: {
          run: async (token: string, work: (r: unknown) => Promise<unknown>, toHttpError: (e: unknown) => Error) => {
            seen.token = token;
            try {
              return await work({ query: async (sql: string) => (seen.sql.push(sql), answer(sql)) });
            } catch (error) {
              throw toHttpError(error);
            }
          },
        },
      },
    ],
  }).compile();
  return { faqs: testingModule.get(FaqsService), seen };
}

describe('admin FAQs list (ticket 168)', () => {
  it('reads every question as the signed-in admin, by topic and in order', async () => {
    const { faqs, seen } = await setUp(() => ROWS);

    await expect(faqs.listForAdmin(TOKENS.admin)).resolves.toEqual(ROWS);

    // As the admin, so Row Level Security lets only admins see hidden ones.
    expect(seen.token).toBe(TOKENS.admin);
    expect(seen.sql[0]).toMatch(/from public\.faqs/);
    expect(seen.sql[0]).toMatch(/order by array_position\(.*\) nulls last, lower\(topic\), topic, position/s);
  });

  it('answers 403 when the database says no permission', async () => {
    const denied = new QueryFailedError('select', [], Object.assign(new Error('permission denied'), { code: '42501' }));
    const { faqs } = await setUp(() => {
      throw denied;
    });

    await expect(faqs.listForAdmin(TOKENS.admin)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

// What a refused box answers: its field, code and message.
const refusalOf = (run: () => unknown) => {
  try {
    run();
  } catch (error) {
    return (error as BadRequestException).getResponse();
  }
  throw new Error('not refused');
};

describe('the FAQ form\'s checks (ticket 169)', () => {
  const good = { question: 'Is it free?', answer: 'Yes.', topic: 'about_platform' };

  it('cleans what was sent: one-line question, paragraphs kept, hidden by default', () => {
    expect(
      faqChangesFrom({ ...good, question: '  Is   it\nfree? ', answer: 'Yes.  \r\n\r\n\r\n\r\nReally. ' }, true),
    ).toEqual({ question: 'Is it free?', answer: 'Yes.\n\nReally.', topic: 'about_platform', is_shown: false });
  });

  it.each([
    [{ ...good, question: '   ' }, 'question', 'question_required', 'Please write the question.'],
    [{ ...good, question: 'q'.repeat(151) }, 'question', 'question_too_long', 'Please keep the question to 150 characters.'],
    [{ ...good, answer: undefined }, 'answer', 'answer_required', 'Please write the answer.'],
    [{ ...good, answer: 'a'.repeat(1001) }, 'answer', 'answer_too_long', 'Please keep the answer to 1000 characters.'],
    [{ ...good, topic: '  ' }, 'topic', 'topic_required', 'Please choose a topic.'],
    [{ ...good, topic: 'B' }, 'topic', 'topic_too_short', 'Please write a topic of 2 to 40 characters.'],
    [{ ...good, topic: 'b'.repeat(41) }, 'topic', 'topic_too_long', 'Please write a topic of 2 to 40 characters.'],
    [{ ...good, is_shown: 'yes' }, 'is_shown', 'is_shown_invalid', 'Please tick or untick "Show on the home page".'],
  ])('refuses one box at a time with its own message (%#)', (body, field, code, message) => {
    expect(refusalOf(() => faqChangesFrom(body, true))).toEqual({ statusCode: 400, field, code, message });
  });

  it('counts an emoji as one character, like the database', () => {
    expect(faqChangesFrom({ ...good, question: '🌴'.repeat(150) }, true).question).toHaveLength(300);
  });

  it('lets Edit send only what changed, but not nothing', () => {
    expect(faqChangesFrom({ is_shown: true }, false)).toEqual({ is_shown: true });
    expect(() => faqChangesFrom({}, false)).toThrow('Nothing to change.');
  });
});

describe('Add and Edit a question (ticket 169)', () => {
  const saved = { ...ROWS[0], is_shown: true };

  it('adds a question at the end of its topic, as the admin', async () => {
    const { faqs, seen } = await setUp(() => [saved]);

    await expect(
      faqs.add(TOKENS.admin, { question: 'Q?', answer: 'A.', topic: 'about_platform', is_shown: true }),
    ).resolves.toEqual(saved);
    expect(seen.token).toBe(TOKENS.admin);
    expect(seen.sql[0]).toMatch(/insert into public\.faqs/);
    expect(seen.sql[0]).toMatch(/max\(position\), 0\) \+ 1 from public\.faqs where topic = \$3/);
  });

  it('answers 409 with the tick box\'s message when the database refuses a 13th shown question', async () => {
    const tooMany = new QueryFailedError('insert', [], Object.assign(new Error('Only 12 questions can show at once. Hide one first.'), { code: '23514', constraint: 'faqs_at_most_12_shown' }));
    const { faqs } = await setUp(() => {
      throw tooMany;
    });

    const refusal = faqs.add(TOKENS.admin, { question: 'Q?', answer: 'A.', topic: 'about_platform', is_shown: true });
    await expect(refusal).rejects.toBeInstanceOf(ConflictException);
    await expect(refusal).rejects.toMatchObject({
      response: { statusCode: 409, field: 'is_shown', code: 'shown_limit', message: 'Only 12 questions can show at once. Hide one first.' },
    });
  });

  it('edits only what was sent, keeping its place in the same topic', async () => {
    const { faqs, seen } = await setUp((sql) =>
      sql.startsWith('select') ? [{ topic: 'about_platform', position: 1 }] : [[saved], 1],
    );

    await expect(faqs.update(TOKENS.admin, 'a', { topic: 'about_platform', is_shown: true })).resolves.toEqual(saved);
    // Locked, then one update; no renumbering (the topic is the same).
    expect(seen.sql).toHaveLength(2);
    expect(seen.sql[0]).toMatch(/for update/);
    expect(seen.sql[1]).toMatch(/coalesce\(\$5, is_shown\)/);
  });

  it('moving it to another topic closes the gap in the old one', async () => {
    const { faqs, seen } = await setUp((sql) =>
      sql.startsWith('select') ? [{ topic: 'about_platform', position: 2 }] : [[saved], 1],
    );

    await faqs.update(TOKENS.admin, 'a', { topic: 'finding_places' });
    expect(seen.sql).toHaveLength(3);
    expect(seen.sql[1]).toMatch(/set position = position - 1 where topic = \$1 and position > \$2/);
  });

  it('answers 404 for an unknown question', async () => {
    const { faqs } = await setUp(() => []);

    await expect(faqs.update(TOKENS.admin, 'gone', { is_shown: false })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('the home page list (ticket 170)', () => {
  it('reads only the shown questions, through the backend\'s own login, in order', async () => {
    const shown = [{ id: 'a', question: 'Is it free?', answer: 'Yes.', topic: 'about_platform' }];
    const { faqs, seen } = await setUp(() => shown);

    await expect(faqs.listShown()).resolves.toEqual(shown);
    expect(seen.token).toBe(''); // not as anyone signed in
    expect(seen.sql[0]).toMatch(/select id, question, answer, topic from public\.faqs where is_shown order by array_position/);
  });

  it('answers 503 with a plain sentence when the database cannot be reached', async () => {
    const { faqs } = await setUp(() => {
      throw new Error('connection refused');
    });

    await expect(faqs.listShown()).rejects.toMatchObject({ status: 503, message: 'Could not load the questions right now.' });
  });
});

describe('Move up, Move down and Delete (ticket 172)', () => {
  const topic = [
    { id: 'a', position: 1 },
    { id: 'b', position: 2 },
    { id: 'c', position: 3 },
  ];

  it('swaps a question with the one above it, as the admin, and answers the new order', async () => {
    const { faqs, seen } = await setUp((sql) => (sql.includes('for update') ? topic : ROWS));

    await expect(faqs.move(TOKENS.admin, 'b', 'up')).resolves.toEqual(ROWS);
    expect(seen.token).toBe(TOKENS.admin);
    // Every question of its topic is locked first.
    expect(seen.sql[0]).toMatch(/where topic = \(select topic from public\.faqs where id = \$1\)[\s\S]*for update/);
    expect(seen.sql[1]).toMatch(/set position = case when id = \$1 then \$3::int else \$4::int end/);
  });

  it.each([
    ['a', 'up', 'It is already the first in its topic.'],
    ['c', 'down', 'It is already the last in its topic.'],
  ] as const)('refuses %s %s with a plain sentence', async (id, direction, message) => {
    const { faqs, seen } = await setUp(() => topic);

    await expect(faqs.move(TOKENS.admin, id, direction)).rejects.toMatchObject({ status: 400, message });
    expect(seen.sql).toHaveLength(1); // nothing changed
  });

  it('answers 404 for a question that is not there', async () => {
    const { faqs } = await setUp(() => []);
    await expect(faqs.move(TOKENS.admin, 'gone', 'up')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('accepts only up or down', () => {
    expect(moveDirectionFrom({ direction: 'down' })).toBe('down');
    expect(() => moveDirectionFrom({ direction: 'left' })).toThrow('Please choose Move up or Move down.');
  });

  it('deletes for good and closes the gap in its topic', async () => {
    const { faqs, seen } = await setUp((sql) => (sql.startsWith('delete') ? [[{ topic: 'about_platform', position: 2 }], 1] : [[], 1]));

    await expect(faqs.remove(TOKENS.admin, 'b')).resolves.toEqual({ id: 'b', message: 'The question has been deleted.' });
    expect(seen.sql[0]).toMatch(/delete from public\.faqs where id = \$1/);
    expect(seen.sql[1]).toMatch(/set position = position - 1 where topic = \$1 and position > \$2/);
    // Not to the Trash.
    expect(seen.sql.join(' ')).not.toMatch(/trash|deleted_at/i);
  });

  it('answers 404 when deleting one that is not there', async () => {
    const { faqs } = await setUp(() => [[], 0]);
    await expect(faqs.remove(TOKENS.admin, 'gone')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('Other topics (ticket 173)', () => {
  const good = { question: 'Q?', answer: 'A.' };

  it('accepts a typed topic, tidied, and keeps built-in ids', () => {
    expect(faqChangesFrom({ ...good, topic: '  Beaches   and  islands ' }, true).topic).toBe('Beaches and islands');
    expect(faqChangesFrom({ ...good, topic: 'about_platform' }, true).topic).toBe('about_platform');
  });

  it("uses a built-in topic when its name is typed under Other", () => {
    expect(faqChangesFrom({ ...good, topic: 'new to ILOILO' }, true).topic).toBe('new_to_iloilo');
  });

  it('joins a custom topic that already exists with other capitals', async () => {
    const saved = { ...ROWS[0], topic: 'Beaches' };
    const { faqs, seen } = await setUp((sql) => (sql.includes('lower(topic) = lower($1)') ? [{ topic: 'Beaches' }] : [saved]));

    await faqs.add(TOKENS.admin, { question: 'Q?', answer: 'A.', topic: 'beaches', is_shown: false });
    const insert = seen.sql.find((sql) => sql.startsWith('insert'));
    expect(insert).toBeDefined();
  });

  it('orders the built-in topics first, then the custom ones A to Z', async () => {
    const { faqs, seen } = await setUp(() => []);
    await faqs.listShown();
    expect(seen.sql[0]).toMatch(/array_position\(.*\) nulls last, lower\(topic\), topic, position/);
  });
});

describe('hidden characters (code review 2026-11-28)', () => {
  it('takes invisible control characters out of every box, so the database never refuses them', () => {
    expect(
      faqChangesFrom({ question: 'Is\u0000 it free?', answer: 'Ye\u0007s.\n\nReally.', topic: 'Beach\u0001es' }, true),
    ).toEqual({ question: 'Is it free?', answer: 'Yes.\n\nReally.', topic: 'Beaches', is_shown: false });
  });
});
