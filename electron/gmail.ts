import { google } from "googleapis";
import { shell } from "electron";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import Store from "electron-store";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "./googleCredentials";

// 발송 첨부파일 확장자별 MIME 타입 (모르는 확장자는 application/octet-stream으로 폴백)
const ATTACHMENT_MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip": "application/zip",
  ".txt": "text/plain",
  ".csv": "text/csv",
};

function guessMimeType(filename: string): string {
  return ATTACHMENT_MIME_TYPES[path.extname(filename).toLowerCase()] ?? "application/octet-stream";
}

// gmail.send: 실제 발송 권한 (이전 버전은 compose만 썼지만, 이번엔 앱에서 직접 보내므로 send로 변경)
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
];

const store = new Store<{ googleTokens?: any }>();

function getOAuthClient() {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith("여기에")) {
    throw new Error(
      "Google OAuth Client ID가 설정되지 않았습니다. 관리자가 electron/googleCredentials.ts를 채운 뒤 다시 빌드해야 합니다."
    );
  }
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, "http://localhost:8721/oauth2callback");
}

export function isGmailAuthed(): boolean {
  return !!store.get("googleTokens");
}

export async function ensureGmailAuth(): Promise<void> {
  const oAuth2Client = getOAuthClient();
  const authUrl = oAuth2Client.generateAuthUrl({ access_type: "offline", scope: SCOPES });

  const code: string = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url ?? "", "http://localhost:8721");
      const code = url.searchParams.get("code");
      res.end("Gmail 인증 완료! 이 창은 닫으셔도 됩니다.");
      server.close();
      if (code) resolve(code);
      else reject(new Error("인증 코드를 받지 못했습니다."));
    });
    server.listen(8721, () => shell.openExternal(authUrl));
  });

  const { tokens } = await oAuth2Client.getToken(code);
  store.set("googleTokens", tokens);
}

async function getGmailClient() {
  const oAuth2Client = getOAuthClient();
  const tokens = store.get("googleTokens");
  if (!tokens) throw new Error("Gmail 로그인이 필요합니다.");
  oAuth2Client.setCredentials(tokens);
  return google.gmail({ version: "v1", auth: oAuth2Client });
}

// ---- 목록: 가벼운 정보만 (Gmail 목록 화면처럼) ----
export type MailFolder = "inbox" | "sent";

// 받은메일함에서는 "보낸사람(From)", 보낸메일함에서는 "받는사람(To)"을 보여줌
const FOLDER_QUERY: Record<MailFolder, string> = { inbox: "in:inbox", sent: "in:sent" };
const FOLDER_SENDER_HEADER: Record<MailFolder, string> = { inbox: "From", sent: "To" };

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
  // 값이 있으면 더 과거 메일이 남아있다는 뜻 — 다음 조회 시 pageToken으로 그대로 넘기면 이어서 가져옴
  nextPageToken?: string;
}

export async function listEmails(
  folder: MailFolder,
  options: { query?: string; maxResults?: number; pageToken?: string } = {}
): Promise<EmailListPage> {
  const gmail = await getGmailClient();
  const senderHeader = FOLDER_SENDER_HEADER[folder];
  // Gmail 검색 문법(from:, has:attachment 등)을 그대로 지원 — 폴더 조건과 함께 조합
  const searchQuery = options.query?.trim();
  const q = searchQuery ? `${FOLDER_QUERY[folder]} ${searchQuery}` : FOLDER_QUERY[folder];
  const list = await gmail.users.messages.list({
    userId: "me",
    q,
    maxResults: options.maxResults ?? 25,
    pageToken: options.pageToken,
  });
  const messages = list.data.messages ?? [];

  const items: EmailListItem[] = [];
  for (const m of messages) {
    if (!m.id) continue;
    const msg = await gmail.users.messages.get({
      userId: "me",
      id: m.id,
      format: "metadata",
      metadataHeaders: ["Subject", senderHeader, "Date"],
    });
    const headers = msg.data.payload?.headers ?? [];
    items.push({
      id: m.id,
      threadId: msg.data.threadId ?? "",
      subject: headers.find((h) => h.name === "Subject")?.value ?? "(제목 없음)",
      sender: headers.find((h) => h.name === senderHeader)?.value ?? "",
      date: headers.find((h) => h.name === "Date")?.value ?? "",
      snippet: msg.data.snippet ?? "",
      isUnread: (msg.data.labelIds ?? []).includes("UNREAD"),
      folder,
    });
  }
  return { items, nextPageToken: list.data.nextPageToken ?? undefined };
}

// ---- 상세: 읽기창을 열었을 때만 조회 ----
export interface AttachmentInfo {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailDetail extends EmailListItem {
  body: string; // 텍스트 버전 (AI 분석용 프롬프트에 사용)
  bodyHtml: string; // HTML 버전 (실제 화면 표시용, 인라인 이미지는 data URI로 치환됨)
  messageIdHeader: string; // 실제 이메일의 Message-ID 헤더 (답장 스레딩용)
  attachments: AttachmentInfo[]; // 본문에 인라인으로 삽입된 이미지는 제외, 실제 첨부파일만
}

export async function getEmailDetail(id: string, folder: MailFolder = "inbox"): Promise<EmailDetail> {
  const gmail = await getGmailClient();
  const senderHeader = FOLDER_SENDER_HEADER[folder];
  const msg = await gmail.users.messages.get({ userId: "me", id, format: "full" });
  const headers = msg.data.payload?.headers ?? [];

  const plain = { value: "" };
  const html = { value: "" };
  const inlineImages = new Map<string, { attachmentId: string; mimeType: string }>();
  const attachments: AttachmentInfo[] = [];
  collectParts(msg.data.payload, plain, html, inlineImages, attachments);

  const bodyHtml = html.value ? await inlineCidImages(gmail, id, html.value, inlineImages) : "";

  return {
    id,
    threadId: msg.data.threadId ?? "",
    subject: headers.find((h) => h.name === "Subject")?.value ?? "(제목 없음)",
    sender: headers.find((h) => h.name === senderHeader)?.value ?? "",
    date: headers.find((h) => h.name === "Date")?.value ?? "",
    snippet: msg.data.snippet ?? "",
    isUnread: (msg.data.labelIds ?? []).includes("UNREAD"),
    folder,
    body: plain.value || stripHtml(html.value),
    bodyHtml,
    messageIdHeader: headers.find((h) => h.name === "Message-ID")?.value ?? "",
    attachments,
  };
}

// payload 트리를 순회하며 text/plain, text/html 본문, (Content-ID가 붙은) 인라인 이미지,
// 그리고 실제 다운로드 대상인 첨부파일(Content-Disposition: inline이 아닌 파일명 있는 파트)을 수집
function collectParts(
  payload: any,
  plain: { value: string },
  html: { value: string },
  inlineImages: Map<string, { attachmentId: string; mimeType: string }>,
  attachments: AttachmentInfo[]
): void {
  if (!payload) return;

  if (payload.mimeType === "text/plain" && payload.body?.data && !plain.value) {
    plain.value = Buffer.from(payload.body.data, "base64").toString("utf-8");
  }
  if (payload.mimeType === "text/html" && payload.body?.data && !html.value) {
    html.value = Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  const contentId: string | undefined = (payload.headers ?? []).find(
    (h: any) => h.name?.toLowerCase() === "content-id"
  )?.value;
  if (contentId && payload.body?.attachmentId) {
    inlineImages.set(contentId.replace(/[<>]/g, ""), {
      attachmentId: payload.body.attachmentId,
      mimeType: payload.mimeType ?? "application/octet-stream",
    });
  }

  const disposition: string | undefined = (payload.headers ?? []).find(
    (h: any) => h.name?.toLowerCase() === "content-disposition"
  )?.value;
  const isInlineDisposition = !!disposition && /inline/i.test(disposition);
  if (payload.filename && payload.body?.attachmentId && !isInlineDisposition) {
    attachments.push({
      attachmentId: payload.body.attachmentId,
      filename: payload.filename,
      mimeType: payload.mimeType ?? "application/octet-stream",
      size: payload.body.size ?? 0,
    });
  }

  for (const part of payload.parts ?? []) {
    collectParts(part, plain, html, inlineImages, attachments);
  }
}

// HTML 안의 cid: 참조(인라인 이미지)를 실제 첨부 데이터를 받아와 data URI로 치환
async function inlineCidImages(
  gmail: any,
  messageId: string,
  html: string,
  inlineImages: Map<string, { attachmentId: string; mimeType: string }>
): Promise<string> {
  const cids = new Set<string>();
  const regex = /cid:([^"')\s]+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) cids.add(match[1]);

  let result = html;
  for (const cid of cids) {
    const info = inlineImages.get(cid);
    if (!info) continue;
    const attachment = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: info.attachmentId,
    });
    const data = attachment.data.data;
    if (!data) continue;
    const standardBase64 = data.replace(/-/g, "+").replace(/_/g, "/");
    result = result.split(`cid:${cid}`).join(`data:${info.mimeType};base64,${standardBase64}`);
  }
  return result;
}

// text/plain 파트가 없을 때(html뿐인 메일) AI 프롬프트용으로 태그를 걷어낸 텍스트를 만듦
function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---- 스레드 컨텍스트: AI 답장 초안 생성 시 "가장 최근 수신 메일 + 지난 대화 이력"을 함께 제공하기 위함 ----
interface ThreadMessage {
  id: string;
  internalDate: number;
  date: string;
  from: string;
  direction: "received" | "sent";
  bodyText: string;
}

interface ThreadContext {
  messages: ThreadMessage[]; // 시간순(오래된 것부터)
  latestInbound: ThreadMessage | null; // 이 스레드에서 가장 최근에 "받은" 메일
}

async function getThreadContext(threadId: string): Promise<ThreadContext> {
  const gmail = await getGmailClient();
  const thread = await gmail.users.threads.get({ userId: "me", id: threadId, format: "full" });
  const rawMessages = thread.data.messages ?? [];

  const messages: ThreadMessage[] = rawMessages
    .map((m) => {
      const headers = m.payload?.headers ?? [];
      const plain = { value: "" };
      const html = { value: "" };
      collectParts(m.payload, plain, html, new Map(), []);
      return {
        id: m.id ?? "",
        internalDate: Number(m.internalDate ?? 0),
        date: headers.find((h) => h.name === "Date")?.value ?? "",
        from: headers.find((h) => h.name === "From")?.value ?? "",
        direction: (m.labelIds ?? []).includes("SENT") ? ("sent" as const) : ("received" as const),
        // AI 프롬프트용 컨텍스트라 과도하게 길어지지 않도록 메시지당 길이 제한
        bodyText: (plain.value || stripHtml(html.value)).slice(0, 2000),
      };
    })
    .sort((a, b) => a.internalDate - b.internalDate);

  let latestInbound: ThreadMessage | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].direction === "received") {
      latestInbound = messages[i];
      break;
    }
  }

  return { messages, latestInbound };
}

// 사용자가 스레드 중 어떤 메일을 열었든, 그 스레드의 가장 최근 수신 메일을 기준으로
// AI 답장 초안을 생성하도록 subject/sender/body를 재구성 (지난 대화 이력은 body에 함께 포함)
export async function buildDraftContext(
  email: EmailDetail
): Promise<{ subject: string; sender: string; body: string }> {
  if (!email.threadId) {
    return { subject: email.subject, sender: email.sender, body: email.body };
  }

  let thread: ThreadContext;
  try {
    thread = await getThreadContext(email.threadId);
  } catch {
    // 스레드 조회 실패 시, 지금 열려있는 메일 하나만으로 기존 동작 유지
    return { subject: email.subject, sender: email.sender, body: email.body };
  }

  const latest = thread.latestInbound;
  if (!latest || thread.messages.length <= 1) {
    return { subject: email.subject, sender: email.sender, body: email.body };
  }

  const history = thread.messages
    .filter((m) => m.id !== latest.id)
    .map((m) => `[${m.direction === "sent" ? "보낸 메일" : "받은 메일"} · ${m.date}]\n${m.bodyText}`)
    .join("\n\n---\n\n");

  const body = history
    ? `다음은 이 스레드의 지난 대화 이력입니다 (오래된 순):\n\n${history}\n\n===\n\n위 대화에 이어, 아래가 이번에 답장해야 할 가장 최근 수신 메일입니다:\n\n${latest.bodyText}`
    : latest.bodyText;

  return { subject: email.subject, sender: latest.from, body };
}

// ---- 첨부파일 다운로드: 읽기창에서 첨부파일 클릭 시 실제 바이너리를 받아옴 ----
export async function getAttachmentBuffer(messageId: string, attachmentId: string): Promise<Buffer> {
  const gmail = await getGmailClient();
  const res = await gmail.users.messages.attachments.get({ userId: "me", messageId, id: attachmentId });
  const data = res.data.data ?? "";
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

// ---- 발송: 사람이 검토/수정한 답장을 실제로 보냄 (같은 스레드로, 첨부파일 포함 가능) ----
export async function sendReply(
  original: EmailDetail,
  replyText: string,
  attachmentPaths: string[] = []
): Promise<void> {
  const gmail = await getGmailClient();
  const toMatch = original.sender.match(/<(.+?)>/);
  const realTo = toMatch ? toMatch[1] : original.sender;

  // ⚠️⚠️⚠️ 임시 테스트 오버라이드 (2026-08-14) ⚠️⚠️⚠️
  // 발송 테스트를 위해 실제 수신자(realTo) 대신 테스트 주소로 강제 발송 중.
  // 사용자가 "원복해달라"고 요청하면 아래 한 줄을 지우고 `const to = realTo;`로 되돌릴 것.
  const to = "xxxx";

  const subject = original.subject.startsWith("Re:") ? original.subject : `Re: ${original.subject}`;

  const headerLines = [`To: ${to}`, `Subject: ${subject}`];
  if (original.messageIdHeader) {
    headerLines.push(`In-Reply-To: ${original.messageIdHeader}`);
    headerLines.push(`References: ${original.messageIdHeader}`);
  }

  let raw: string;
  if (attachmentPaths.length === 0) {
    headerLines.push("Content-Type: text/plain; charset=utf-8");
    raw = [...headerLines, "", replyText].join("\r\n");
  } else {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    headerLines.push("MIME-Version: 1.0");
    headerLines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

    const bodyParts = [`--${boundary}`, "Content-Type: text/plain; charset=utf-8", "", replyText];

    for (const filePath of attachmentPaths) {
      const filename = path.basename(filePath);
      const mimeType = guessMimeType(filename);
      const base64 = fs.readFileSync(filePath).toString("base64");
      const wrapped = base64.replace(/(.{76})/g, "$1\r\n");
      bodyParts.push(
        `--${boundary}`,
        `Content-Type: ${mimeType}; name="${filename}"`,
        `Content-Disposition: attachment; filename="${filename}"`,
        "Content-Transfer-Encoding: base64",
        "",
        wrapped
      );
    }
    bodyParts.push(`--${boundary}--`);

    raw = [...headerLines, "", ...bodyParts].join("\r\n");
  }

  const encoded = Buffer.from(raw).toString("base64url");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encoded, threadId: original.threadId },
  });
}
