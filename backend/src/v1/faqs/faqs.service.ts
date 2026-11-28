import {
  BadRequestException,
  ConflictException,
  type HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, type QueryRunner } from 'typeorm';
import { databaseErrorCode, httpErrorFrom } from '../database-errors';
import { TravelerTransactions } from '../traveler-transactions';

// The home page's frequently asked questions (FAQs round, ticket 168; the
// faqs table, supabase/migrations/…_add_faqs.sql).

// The three built-in topics, in the order the site shows them.
export type BuiltInFaqTopic = 'new_to_iloilo' | 'about_platform' | 'finding_places';
export const FAQ_TOPICS: BuiltInFaqTopic[] = ['new_to_iloilo', 'about_platform', 'finding_places'];
// A built-in topic's id, or (since ticket 173, "Other") a topic name the
// team typed, such as "Beaches". Custom topics come after the built-in
// ones, A to Z.
export type FaqTopic = string;

// A custom topic's length (the database checks it too).
export const FAQ_TOPIC_NAME = { min: 2, max: 40 };

// The built-in topics' names as the site shows them, so typing "New to
// Iloilo" under Other uses that topic instead of making a second one.
const BUILT_IN_BY_NAME: Record<string, BuiltInFaqTopic> = {
  'new to iloilo': 'new_to_iloilo',
  'about lakat iloilo': 'about_platform',
  'finding the right place': 'finding_places',
};

// The longest question and answer (the database checks them too).
export const FAQ_LIMITS = { question: 150, answer: 1000 };

// The 13th shown question's message. The limit of 12 itself lives in the
// database (faqs_at_most_12_shown), which counts every shown question.
export const SHOWN_LIMIT_MESSAGE = 'Only 12 questions can show at once. Hide one first.';

export interface AdminFaqDto {
  id: string;
  question: string;
  answer: string;
  topic: FaqTopic;
  // Its order inside its topic, from 1.
  position: number;
  is_shown: boolean;
  updated_at: string;
}

// One shown question as the home page gets it (ticket 170).
export type FaqDto = Pick<AdminFaqDto, 'id' | 'question' | 'answer' | 'topic'>;

// What Add sends (all of it) and Edit sends (any of it), already checked.
export interface FaqChanges {
  question?: string;
  answer?: string;
  topic?: FaqTopic;
  is_shown?: boolean;
}
export type NewFaq = Required<FaqChanges>;

// A refusal for one box of the form: the website puts `message` under the
// box named by `field` (ticket 169).
const boxRefusal = (field: keyof FaqChanges, code: string, message: string) =>
  new BadRequestException({ statusCode: 400, field, code, message });

// Characters as the database counts them (char_length), so an emoji is 1.
const characters = (text: string) => [...text].length;

// The question is one line: spaces and line breaks become one space.
// Invisible control characters (code review 2026-11-28): a pasted text can
// carry them, and the database refuses them (a NUL anywhere, any of them
// in a topic). They are taken out of every box; tabs and line breaks are
// kept for the steps below.
const HIDDEN_CHARACTERS = /[\u0000-\u0008\u000e-\u001f\u007f-\u009f]/g;
const cleanQuestion = (text: string) => text.replace(HIDDEN_CHARACTERS, '').replace(/\s+/g, ' ').trim();
// The answer keeps its paragraphs: Windows line ends become \n, spaces at
// the end of each line go, and more than one empty line becomes one.
const cleanAnswer = (text: string) =>
  text
    .replace(HIDDEN_CHARACTERS, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

// Checks what the form sent, with a plain sentence for the first problem
// (the same checks and words as the form, src/lib/faqs.ts). `all` is true
// for Add, where every box is needed; Edit may send any of them.
export function faqChangesFrom(body: Record<string, unknown> | undefined, all: true): NewFaq;
export function faqChangesFrom(body: Record<string, unknown> | undefined, all: false): FaqChanges;
export function faqChangesFrom(body: Record<string, unknown> | undefined, all: boolean): FaqChanges {
  const changes: FaqChanges = {};
  if (all || body?.question !== undefined) {
    const question = typeof body?.question === 'string' ? cleanQuestion(body.question) : '';
    if (!question) throw boxRefusal('question', 'question_required', 'Please write the question.');
    if (characters(question) > FAQ_LIMITS.question) {
      throw boxRefusal('question', 'question_too_long', `Please keep the question to ${FAQ_LIMITS.question} characters.`);
    }
    changes.question = question;
  }
  if (all || body?.answer !== undefined) {
    const answer = typeof body?.answer === 'string' ? cleanAnswer(body.answer) : '';
    if (!answer) throw boxRefusal('answer', 'answer_required', 'Please write the answer.');
    if (characters(answer) > FAQ_LIMITS.answer) {
      throw boxRefusal('answer', 'answer_too_long', `Please keep the answer to ${FAQ_LIMITS.answer} characters.`);
    }
    changes.answer = answer;
  }
  if (all || body?.topic !== undefined) {
    // A built-in id, or a topic name typed under Other (ticket 173).
    const typed = typeof body?.topic === 'string' ? cleanQuestion(body.topic) : '';
    if (!typed) throw boxRefusal('topic', 'topic_required', 'Please choose a topic.');
    if (FAQ_TOPICS.includes(typed as BuiltInFaqTopic)) {
      changes.topic = typed;
    } else if (BUILT_IN_BY_NAME[typed.toLowerCase()]) {
      changes.topic = BUILT_IN_BY_NAME[typed.toLowerCase()];
    } else {
      const length = characters(typed);
      if (length < FAQ_TOPIC_NAME.min || length > FAQ_TOPIC_NAME.max) {
        throw boxRefusal(
          'topic',
          length < FAQ_TOPIC_NAME.min ? 'topic_too_short' : 'topic_too_long',
          `Please write a topic of ${FAQ_TOPIC_NAME.min} to ${FAQ_TOPIC_NAME.max} characters.`,
        );
      }
      changes.topic = typed;
    }
  }
  if (all || body?.is_shown !== undefined) {
    // Add may leave it out: a new question is hidden.
    const shown = body?.is_shown ?? false;
    if (typeof shown !== 'boolean') {
      throw boxRefusal('is_shown', 'is_shown_invalid', 'Please tick or untick "Show on the home page".');
    }
    changes.is_shown = shown;
  }
  if (Object.keys(changes).length === 0) throw new BadRequestException('Nothing to change.');
  return changes;
}

const COLUMNS = 'id, question, answer, topic, position, is_shown, updated_at';

// Move up or Move down (ticket 172).
export type MoveDirection = 'up' | 'down';
export function moveDirectionFrom(body: Record<string, unknown> | undefined): MoveDirection {
  const direction = body?.direction;
  if (direction !== 'up' && direction !== 'down') {
    throw new BadRequestException('Please choose Move up or Move down.');
  }
  return direction;
}

// Topic order first: the built-in ones (as FAQ_TOPICS), then the custom
// ones A to Z (ticket 173); then each question's position.
const ORDER_BY = `array_position(array['new_to_iloilo','about_platform','finding_places'], topic) nulls last, lower(topic), topic, position`;

// A custom topic typed again with other capitals ("beaches" when
// "Beaches" exists) joins the one already there instead of making a
// second topic (ticket 173). Built-in ids are kept as they are.
async function sameTopicAs(runner: QueryRunner, topic: string): Promise<string> {
  if (FAQ_TOPICS.includes(topic as BuiltInFaqTopic)) return topic;
  const [found]: { topic: string }[] = await runner.query(
    'select topic from public.faqs where lower(topic) = lower($1) order by topic limit 1',
    [topic],
  );
  return found?.topic ?? topic;
}

// Reading the hidden questions runs AS the signed-in admin
// (TravelerTransactions), so Row Level Security decides: the backend's
// own login may read only the shown ones.
@Injectable()
export class FaqsService {
  private readonly logger = new Logger(FaqsService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly travelerTransactions: TravelerTransactions,
  ) {}

  // The shown questions, by topic and in order, for the home page (ticket
  // 170). Anyone may ask. Read through the backend's own login, which Row
  // Level Security lets read the shown ones only ("api can read shown
  // faqs"); "where is_shown" says the same, so a hidden question can never
  // leave through here.
  async listShown(): Promise<FaqDto[]> {
    try {
      return await this.dataSource.query(
        `select id, question, answer, topic from public.faqs where is_shown order by ${ORDER_BY}`,
      );
    } catch (error) {
      this.logger.error(`Could not read the questions: ${String(error)}`);
      throw new ServiceUnavailableException('Could not load the questions right now.');
    }
  }

  private asAdmin<T>(
    accessToken: string,
    what: string,
    work: (runner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    return this.travelerTransactions.run(accessToken, work, (error) => this.toHttpError(error, what));
  }

  // The database's refusals as plain answers: the 13th shown question
  // (faqs_at_most_12_shown) is 409 with the tick box's own message; two
  // admins adding to one topic at the same moment (the same position) is
  // 409 "try again"; anything else as every admin screen (403, 503).
  private toHttpError(error: unknown, what: string): HttpException {
    const constraint =
      error instanceof QueryFailedError
        ? (error.driverError as { constraint?: string } | undefined)?.constraint
        : undefined;
    if (databaseErrorCode(error) === '23514' && constraint === 'faqs_at_most_12_shown') {
      return new ConflictException({ statusCode: 409, field: 'is_shown', code: 'shown_limit', message: SHOWN_LIMIT_MESSAGE });
    }
    return httpErrorFrom(error, this.logger, what, {
      '23505': () => new ConflictException('Someone changed the questions at the same moment. Please try again.'),
      '23514': () => new BadRequestException('Please check the question and answer, then try again.'),
    });
  }

  // Every question, shown and hidden, by topic and in order (/admin/faqs).
  listForAdmin(accessToken: string): Promise<AdminFaqDto[]> {
    return this.asAdmin(accessToken, 'load the questions', (runner) =>
      runner.query(`select ${COLUMNS} from public.faqs order by ${ORDER_BY}`),
    );
  }

  // Add (ticket 169): a new question goes to the end of its topic.
  add(accessToken: string, faq: NewFaq): Promise<AdminFaqDto> {
    return this.asAdmin(accessToken, 'add the question', async (runner) => {
      const topic = await sameTopicAs(runner, faq.topic);
      const [added]: AdminFaqDto[] = await runner.query(
        `insert into public.faqs (question, answer, topic, is_shown, position)
         values ($1, $2, $3, $4,
                 (select coalesce(max(position), 0) + 1 from public.faqs where topic = $3))
         returning ${COLUMNS}`,
        [faq.question, faq.answer, topic, faq.is_shown],
      );
      return added;
    });
  }

  // Edit (ticket 169): only what was sent changes. A question moved to
  // another topic goes to the end of it, and the questions after it in
  // its old topic move up one, so the numbers stay 1, 2, 3 (the "same
  // place twice" rule is checked at the end, so the order of the two
  // updates does not matter).
  update(accessToken: string, id: string, changes: FaqChanges): Promise<AdminFaqDto> {
    return this.asAdmin(accessToken, 'save the question', async (runner) => {
      const [current]: Pick<AdminFaqDto, 'topic' | 'position'>[] = await runner.query(
        'select topic, position from public.faqs where id = $1 for update',
        [id],
      );
      if (!current) throw new NotFoundException("We couldn't find that question.");
      if (changes.topic !== undefined) changes = { ...changes, topic: await sameTopicAs(runner, changes.topic) };

      const newTopic = changes.topic !== undefined && changes.topic !== current.topic;
      if (newTopic) {
        await runner.query(
          'update public.faqs set position = position - 1 where topic = $1 and position > $2',
          [current.topic, current.position],
        );
      }
      const [rows]: [AdminFaqDto[], number] = await runner.query(
        `update public.faqs
            set question = coalesce($2, question),
                answer = coalesce($3, answer),
                topic = coalesce($4, topic),
                is_shown = coalesce($5, is_shown),
                position = case when $6
                                then (select coalesce(max(f.position), 0) + 1 from public.faqs f where f.topic = $4)
                                else position end
          where id = $1
          returning ${COLUMNS}`,
        [id, changes.question ?? null, changes.answer ?? null, changes.topic ?? null, changes.is_shown ?? null, newTopic],
      );
      return rows[0];
    });
  }

  // Move up / Move down (ticket 172): swaps it with its neighbour in its
  // topic and answers with the whole list in its new order. Every
  // question of the topic is locked first, so two admins moving at the
  // same moment take turns (the "same place twice" rule is checked at the
  // end, so the two positions can swap). 400 at the first or last.
  move(accessToken: string, id: string, direction: MoveDirection): Promise<AdminFaqDto[]> {
    return this.asAdmin(accessToken, 'move the question', async (runner) => {
      const rows: Pick<AdminFaqDto, 'id' | 'position'>[] = await runner.query(
        `select id, position from public.faqs
          where topic = (select topic from public.faqs where id = $1)
          order by position
            for update`,
        [id],
      );
      const at = rows.findIndex((row) => row.id === id);
      if (at === -1) throw new NotFoundException("We couldn't find that question.");
      const other = rows[direction === 'up' ? at - 1 : at + 1];
      if (!other) {
        throw new BadRequestException(
          direction === 'up' ? 'It is already the first in its topic.' : 'It is already the last in its topic.',
        );
      }
      await runner.query(
        `update public.faqs
            set position = case when id = $1 then $3::int else $4::int end
          where id in ($1, $2)`,
        [id, other.id, other.position, rows[at].position],
      );
      return runner.query(`select ${COLUMNS} from public.faqs order by ${ORDER_BY}`);
    });
  }

  // Delete (ticket 172): for good, not to the Trash. The questions after
  // it in its topic move up one, so the numbers stay 1, 2, 3. The website
  // waits 8 seconds before sending it (Undo), as for every delete on the
  // dashboard.
  remove(accessToken: string, id: string): Promise<{ id: string; message: string }> {
    return this.asAdmin(accessToken, 'delete the question', async (runner) => {
      const [rows]: [Pick<AdminFaqDto, 'topic' | 'position'>[], number] = await runner.query(
        'delete from public.faqs where id = $1 returning topic, position',
        [id],
      );
      if (rows.length === 0) throw new NotFoundException("We couldn't find that question.");
      await runner.query(
        'update public.faqs set position = position - 1 where topic = $1 and position > $2',
        [rows[0].topic, rows[0].position],
      );
      return { id, message: 'The question has been deleted.' };
    });
  }
}
