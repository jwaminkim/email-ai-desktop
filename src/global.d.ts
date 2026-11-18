import type { ProviderSettings, EmailAnalysis, ChatMessage } from "../electron/providers/types";

export type { ChatMessage };

export type MailFolder = "inbox" | "sent";

export interface EmailListItem {
  id: string;
  threadId: string;
  subject: string;
  sender: string; // inbox: 보낸사람 / sent: 받는사람
  snippet: string;
  date: string;
  isUnread: boolean;
  folder: MailFolder;
}

export interface EmailListPage {
  items: EmailListItem[];
  nextPageToken?: string;
}

export interface AttachmentInfo {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailDetail extends EmailListItem {
  body: string;
  bodyHtml: string;
  messageIdHeader: string;
  attachments: AttachmentInfo[];
}

export interface AttachmentDownloadResult {
  ok: boolean;
  path?: string;
  canceled?: boolean;
}

// 답장 작성 시 첨부하려고 로컬에서 고른 파일 (실제 업로드는 발송 시점에 경로로 읽어서 처리)
export interface PickedFile {
  path: string;
  filename: string;
  size: number;
}

export interface OnboardingStatus {
  gmailAuthed: boolean;
  providerConfigured: boolean;
}

declare global {
  interface Window {
    api: {
      getOnboardingStatus: () => Promise<OnboardingStatus>;

      gmailAuth: () => Promise<void>;

      getSettings: () => Promise<ProviderSettings>;
      setSettings: (settings: ProviderSettings) => Promise<void>;
      listModels: (providerId: ProviderSettings["activeProvider"], settings: ProviderSettings) => Promise<string[]>;

      listEmails: (folder: MailFolder, query?: string, pageToken?: string) => Promise<EmailListPage>;
      getEmail: (id: string, folder: MailFolder) => Promise<EmailDetail>;

      generateDraft: (email: EmailDetail) => Promise<EmailAnalysis>;
      askAboutEmail: (email: EmailDetail, history: ChatMessage[]) => Promise<string>;
      sendReply: (email: EmailDetail, replyText: string, attachmentPaths?: string[]) => Promise<void>;

      downloadAttachment: (
        messageId: string,
        attachmentId: string,
        filename: string
      ) => Promise<AttachmentDownloadResult>;
      pickAttachments: () => Promise<PickedFile[]>;
    };
  }
}
