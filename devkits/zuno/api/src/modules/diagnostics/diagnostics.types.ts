export type ZunoConfig = {
  sourceRoot: string;
  platformLogPath: string;
  providerBaseUrl: string;
  providerModel: string;
  providerApiKey: string;
};

export type ZunoStatus = {
  sourceReady: boolean;
  logReady: boolean;
  modelReady: boolean;
};

export type ZunoEvidence = { source: string; content: string };
export type ZunoDiagnosis = { answer: string; evidence: ZunoEvidence[] };
