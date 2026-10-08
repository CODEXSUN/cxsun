export type ZunoStatus = { sourceReady: boolean; logReady: boolean; modelReady: boolean };
export type ZunoDiagnosis = {
  answer: string;
  evidence: Array<{ source: string; content: string }>;
};
