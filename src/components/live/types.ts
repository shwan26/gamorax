import type { Game } from "@/src/lib/gameStorage";
import type { Question } from "@/src/lib/questionStorage";
import type { LiveStatus } from "@/src/lib/liveStorage"; // ✅ use the one type

export type { LiveStatus }; // optional re-export if you want

export type GameWithShuffle = Game & {
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
};

export type LiveDisplayQuestion =
  | (Question & { type: "multiple_choice" | "true_false" })
  | (Question & { type: "matching"; left: string[]; right: string[] })
  | (Question & { type: "input" });

export type CountsTuple = [number, number, number, number];
