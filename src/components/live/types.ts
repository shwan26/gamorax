import type { Game } from "@/src/lib/games/gameStorage";
import type { Question } from "@/src/lib/games/questionStorage";
import type { LiveStatus } from "@/src/lib/live/liveStorage"; // ✅ use the one type
import type { LiveQuestionType } from "@/src/lib/live/liveStorage";

export type { LiveStatus }; // optional re-export if you want

export type GameWithShuffle = Game & {
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
};

export type LiveDisplayQuestion =
  | (Question & { type: Extract<LiveQuestionType, "multiple_choice" | "true_false"> })
  | (Question & { type: "matching"; left: string[]; right: string[] })
  | (Question & { type: "input" });

export type CountsTuple = [number, number, number, number];
