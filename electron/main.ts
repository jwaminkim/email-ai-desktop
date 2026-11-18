import { app, BrowserWindow, ipcMain, dialog } from "electron";
import * as path from "path";
import * as fs from "fs";
import Store from "electron-store";
import { ChatMessage, ProviderId, ProviderSettings, DEFAULT_SETTINGS, getProvider } from "./providers";
import { listModels } from "./providers/modelList";
import {
  isGmailAuthed,
  ensureGmailAuth,
  listEmails,
  getEmailDetail,
  sendReply,
  buildDraftContext,
  getAttachmentBuffer,
  EmailDetail,
  MailFolder,
} from "./gmail";

const settingsStore = new Store<{ providerSettings: ProviderSettings }>();

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    icon: path.join(__dirname, "../build/icon.png"),
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) win.loadURL(devUrl);
  else win.loadFile(path.join(__dirname, "../dist/index.html"));
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ---- 온보딩 상태 ----
ipcMain.handle("onboarding:status", () => {
  const settings = settingsStore.get("providerSettings");
  const providerConfigured = !!settings && getProvider(settings).isConfigured();
  return { gmailAuthed: isGmailAuthed(), providerConfigured };
});

// ---- Gmail 로그인 ----
ipcMain.handle("gmail:auth", async () => {
  await ensureGmailAuth();
});

// ---- 설정 (AI 모델) ----
ipcMain.handle("settings:get", () => settingsStore.get("providerSettings", DEFAULT_SETTINGS));
ipcMain.handle("settings:set", (_e, settings: ProviderSettings) => {
  settingsStore.set("providerSettings", settings);
});
// 설정 화면의 모델 셀렉트박스용 — 그 프로바이더가 지금 실제로 제공하는 모델 목록을 매번 새로 조회
ipcMain.handle("settings:listModels", async (_e, providerId: ProviderId, settings: ProviderSettings) =>
  listModels(providerId, settings)
);

// ---- 받은메일함 / 보낸메일함 (pageToken 넘기면 그 다음 페이지, 즉 더 과거 메일을 가져옴) ----
ipcMain.handle(
  "gmail:list",
  async (_e, folder: MailFolder, query?: string, pageToken?: string) =>
    listEmails(folder, { query, pageToken })
);
ipcMain.handle("gmail:getEmail", async (_e, id: string, folder: MailFolder) => getEmailDetail(id, folder));

// ---- AI 답장 초안 생성 (버튼 클릭 시에만 호출됨) ----
ipcMain.handle("email:generateDraft", async (_e, email: EmailDetail) => {
  const settings = settingsStore.get("providerSettings", DEFAULT_SETTINGS);
  const provider = getProvider(settings);

  if (!provider.isConfigured()) {
    throw new Error(`${provider.name}이(가) 설정되지 않았습니다. 설정에서 확인하세요.`);
  }

  // 스레드 중 어떤 메일을 열었든, 그 스레드의 가장 최근 수신 메일 기준으로 초안을 생성
  const { subject, sender, body } = await buildDraftContext(email);
  return provider.analyzeEmail(subject, sender, body);
});

// ---- 메일 내용에 대해 대화형으로 질문 (읽기창의 "질문하기" 탭) ----
ipcMain.handle("email:askAboutEmail", async (_e, email: EmailDetail, history: ChatMessage[]) => {
  const settings = settingsStore.get("providerSettings", DEFAULT_SETTINGS);
  const provider = getProvider(settings);

  if (!provider.isConfigured()) {
    throw new Error(`${provider.name}이(가) 설정되지 않았습니다. 설정에서 확인하세요.`);
  }

  // 답장 초안과 동일하게, 스레드의 가장 최근 수신 메일 + 지난 대화 이력을 근거로 답변
  const { subject, sender, body } = await buildDraftContext(email);
  return provider.askAboutEmail(history, subject, sender, body);
});

// ---- 실제 발송 (사람이 검토/수정한 최종 텍스트 + 첨부파일) ----
ipcMain.handle(
  "email:send",
  async (_e, email: EmailDetail, replyText: string, attachmentPaths: string[] = []) => {
    await sendReply(email, replyText, attachmentPaths);
  }
);

// ---- 답장 초안 작성 시 첨부파일 선택 (네이티브 "파일 열기" 대화상자, 여러 개 선택 가능) ----
ipcMain.handle("compose:pickAttachments", async () => {
  const result = await dialog.showOpenDialog({ properties: ["openFile", "multiSelections"] });
  if (result.canceled) return [];
  return result.filePaths.map((filePath) => ({
    path: filePath,
    filename: path.basename(filePath),
    size: fs.statSync(filePath).size,
  }));
});

// ---- 첨부파일 다운로드 (읽기창에서 클릭 시 "다른 이름으로 저장" 창을 띄움) ----
ipcMain.handle(
  "attachment:download",
  async (_e, messageId: string, attachmentId: string, filename: string) => {
    const result = await dialog.showSaveDialog({ defaultPath: filename });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };

    const buffer = await getAttachmentBuffer(messageId, attachmentId);
    fs.writeFileSync(result.filePath, buffer);
    return { ok: true, path: result.filePath };
  }
);
