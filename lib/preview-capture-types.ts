export type PreviewLeadSnapshot = {
  name: string;
  score: number;
  signal: string;
  why: string;
  pitchExcerpt: string;
};

export type PreviewCaptureRow = {
  id: string;
  email: string;
  market: string;
  searchId: string | null;
  leadCount: number;
  previewSnapshot: PreviewLeadSnapshot[];
  unsubscribeToken: string;
  email1SentAt: string | null;
  email2SentAt: string | null;
  email3SentAt: string | null;
  convertedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
};
