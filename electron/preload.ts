import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  // 온보딩
  getOnboardingStatus: () => ipcRenderer.invoke("onboarding:status"),

  // Gmail 로그인
  gmailAuth: () => ipcRenderer.invoke("gmail:auth"),

  // AI 모델 설정
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (settings: unknown) => ipcRenderer.invoke("settings:set", settings),
  listModels: (providerId: string, settings: unknown) =>
    ipcRenderer.invoke("settings:listModels", providerId, settings),

  // 받은메일함 / 보낸메일함 (query는 Gmail 검색 문법 그대로, pageToken 넘기면 이전 페이지 이어서 조회)
  listEmails: (folder: "inbox" | "sent", query?: string, pageToken?: string) =>
    ipcRenderer.invoke("gmail:list", folder, query, pageToken),
  getEmail: (id: string, folder: "inbox" | "sent") => ipcRenderer.invoke("gmail:getEmail", id, folder),

  // AI 답장 초안 생성 (버튼 클릭 시)
  generateDraft: (email: unknown) => ipcRenderer.invoke("email:generateDraft", email),

  // 메일 내용에 대해 대화형으로 질문 ("질문하기" 탭)
  askAboutEmail: (email: unknown, history: unknown) => ipcRenderer.invoke("email:askAboutEmail", email, history),

  // 실제 발송 (답장에 첨부할 파일 경로 목록 포함 가능)
  sendReply: (email: unknown, replyText: string, attachmentPaths: string[] = []) =>
    ipcRenderer.invoke("email:send", email, replyText, attachmentPaths),

  // 첨부파일 다운로드 (받은 메일)
  downloadAttachment: (messageId: string, attachmentId: string, filename: string) =>
    ipcRenderer.invoke("attachment:download", messageId, attachmentId, filename),

  // 답장 작성 시 첨부할 파일 선택 (보낼 메일)
  pickAttachments: () => ipcRenderer.invoke("compose:pickAttachments"),
});
