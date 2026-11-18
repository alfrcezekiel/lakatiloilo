import { describe, expect, it } from "vitest";
import { reply } from "../../test/fixtures/reviews";
import { groupAnswers, repliesAfterDelete } from "./reply-threads";

const ids = (list: { id: string }[] | undefined) => (list ?? []).map((r) => r.id);

describe("groupAnswers", () => {
  it("gives nothing for a review with no replies", () => {
    expect(groupAnswers([]).size).toBe(0);
  });

  it("keeps replies to the review oldest first", () => {
    const answers = groupAnswers([reply("r1", null, 1), reply("r2", null, 2), reply("r3", null, 3)]);
    expect(ids(answers.get(""))).toEqual(["r1", "r2", "r3"]);
  });

  it("puts answers to a reply newest first", () => {
    const answers = groupAnswers([
      reply("r1", null, 1),
      reply("a1", "r1", 2),
      reply("a2", "r1", 3),
      reply("a3", "r1", 4),
    ]);
    expect(ids(answers.get("r1"))).toEqual(["a3", "a2", "a1"]);
  });

  it("groups answers at every level under the reply they answer", () => {
    const answers = groupAnswers([reply("r1", null, 1), reply("a1", "r1", 2), reply("b1", "a1", 3)]);
    expect(ids(answers.get("a1"))).toEqual(["b1"]);
  });
});

describe("repliesAfterDelete (the same rules as the database, supabase/sql/034)", () => {
  it("removes a reply nobody answered", () => {
    const { list, gone } = repliesAfterDelete([reply("r1", null, 1), reply("r2", null, 2)], "r2");

    expect(ids(list)).toEqual(["r1"]);
    expect([...gone]).toEqual(["r2"]);
  });

  it('keeps a reply that has answers as "This reply was deleted", with no name, text or likes', () => {
    const replies = [reply("r1", null, 1, { helpful_count: 4, liked_by_me: true }), reply("a1", "r1", 2)];

    const { list, gone } = repliesAfterDelete(replies, "r1");
    const kept = list.find((r) => r.id === "r1");

    expect(gone.size).toBe(0);
    expect(ids(list)).toEqual(["r1", "a1"]);
    expect(kept).toMatchObject({
      deleted: true,
      replier_name: "",
      comment: "",
      user_id: "",
      helpful_count: 0,
      liked_by_me: false,
    });
  });

  it("also removes a deleted reply above it that is left with no answers", () => {
    const replies = [reply("r1", null, 1, { deleted: true }), reply("a1", "r1", 2)];

    const { list, gone } = repliesAfterDelete(replies, "a1");

    expect(list).toEqual([]);
    expect([...gone].sort()).toEqual(["a1", "r1"]);
  });

  it("keeps the deleted reply above when it still has another answer", () => {
    const replies = [reply("r1", null, 1, { deleted: true }), reply("a1", "r1", 2), reply("a2", "r1", 3)];

    const { list } = repliesAfterDelete(replies, "a1");

    expect(ids(list)).toEqual(["r1", "a2"]);
  });

  it("never removes a reply above that was not deleted", () => {
    const replies = [reply("r1", null, 1), reply("a1", "r1", 2)];

    const { list } = repliesAfterDelete(replies, "a1");

    expect(ids(list)).toEqual(["r1"]);
  });

  it("does not change the list it was given", () => {
    const replies = [reply("r1", null, 1), reply("a1", "r1", 2)];
    const before = structuredClone(replies);

    repliesAfterDelete(replies, "r1");

    expect(replies).toEqual(before);
  });
});
