package com.ainovel.service.ai;

import com.ainovel.entity.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.function.Consumer;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiGenerationService {

    private final RestTemplate restTemplate = new RestTemplate();

    // ========== 大纲生成（用完整风格描述） ==========

    public String generateOutline(Novel novel, WritingStyle style, ModelProvider provider, String prompt) {
        String sp = "你是写作助手，请根据以下设定为小说生成大纲。"
                + "\n" + buildStyleFull(style)
                + "\n小说：《" + novel.getTitle() + "》" + nvl(novel.getGenre()) + "\n" + nvl(novel.getDescription());
        return callAiApi(provider, sp, prompt);
    }

    // ========== 章节生成（精简 prompt + 大纲截断） ==========

    public String generateChapterContent(Novel novel, WritingStyle style, ModelProvider provider,
                                          String chapterTitle, String chapterOutline,
                                          String novelOutline, String previousSummary,
                                          int targetWords) {
        String sp = buildNovelContext(novel, style, novelOutline);
        String up = buildChapterUserPrompt(chapterTitle, chapterOutline, previousSummary, targetWords);
        return callAiApi(provider, sp, up);
    }

    // ========== 续写 ==========

    public String continueWriting(ModelProvider provider, WritingStyle style,
                                   String previousContent, int targetWords) {
        String sp = "请续写小说。" + buildStyleCompact(style);
        String up = "续写" + targetWords + "字：\n" + (previousContent != null ? previousContent : "");
        return callAiApi(provider, sp, up);
    }

    // ========== Prompt 构建 ==========

    /** 章节生成：精简上下文 */
    public String buildNovelContext(Novel novel, WritingStyle style, String novelOutline) {
        StringBuilder sb = new StringBuilder();
        sb.append("正在创作《").append(novel.getTitle()).append("》");
        sb.append("(").append(nvl(novel.getGenre())).append(")。");
        sb.append(buildStyleCompact(style));

        if (novelOutline != null && !novelOutline.isEmpty()) {
            String outline = novelOutline.length() > 1500
                    ? novelOutline.substring(0, 1500) + "...(截断)"
                    : novelOutline;
            sb.append("【大纲】").append(outline);
            sb.append("请严格按大纲编写，情节连贯。");
        }
        return sb.toString();
    }

    /** 章节生成：用户提示 */
    public String buildChapterUserPrompt(String title, String outline, String prev, int words) {
        StringBuilder sb = new StringBuilder();
        sb.append("写「").append(title).append("」，至少").append(words).append("字，必须写够。");
        if (prev != null && !prev.isEmpty()) sb.append("【前情】" + prev + "请紧接上文续写，情节连贯。");
        if (outline != null && !outline.isEmpty()) sb.append("本章要点：" + outline);
        sb.append("直接输出正文。");
        return sb.toString();
    }

    /** 章节用精简风格（省 token） */
    private String buildStyleCompact(WritingStyle style) {
        if (style == null) return "";
        StringBuilder sb = new StringBuilder("【").append(style.getName()).append("】");
        if (!isEmpty(style.getWritingStyleDesc())) sb.append(style.getWritingStyleDesc()).append("。");
        if (!isEmpty(style.getTone())) sb.append("文风").append(style.getTone()).append("。");
        if (!isEmpty(style.getPlotStyle())) sb.append(style.getPlotStyle()).append("。");
        return sb.toString();
    }

    /** 大纲用完整风格描述 */
    private String buildStyleFull(WritingStyle style) {
        if (style == null) return "";
        StringBuilder sb = new StringBuilder();
        sb.append("风格：").append(style.getName()).append("\n");
        if (!isEmpty(style.getWritingStyleDesc())) sb.append("写作：").append(style.getWritingStyleDesc()).append("\n");
        if (!isEmpty(style.getWritingPreferences())) sb.append("偏好：").append(style.getWritingPreferences()).append("\n");
        if (!isEmpty(style.getGenrePreferences())) sb.append("题材：").append(style.getGenrePreferences()).append("\n");
        if (!isEmpty(style.getTone())) sb.append("语调：").append(style.getTone()).append("\n");
        if (!isEmpty(style.getCharacterStyle())) sb.append("角色：").append(style.getCharacterStyle()).append("\n");
        if (!isEmpty(style.getPlotStyle())) sb.append("情节：").append(style.getPlotStyle()).append("\n");
        if (!isEmpty(style.getOtherSettings())) sb.append("其他：").append(style.getOtherSettings()).append("\n");
        return sb.toString();
    }

    // ========== API 调用 ==========

    @SuppressWarnings("unchecked")
    private String callAiApi(ModelProvider provider, String systemPrompt, String userPrompt) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", provider.getModelName());
        body.put("temperature", 0.8);
        body.put("max_tokens", 4096);

        Map<String, String> sm = new HashMap<>(); sm.put("role", "system"); sm.put("content", systemPrompt);
        Map<String, String> um = new HashMap<>(); um.put("role", "user"); um.put("content", userPrompt);
        List<Map<String, String>> msgs = new ArrayList<>(); msgs.add(sm); msgs.add(um);
        body.put("messages", msgs);

        String base = provider.getBaseUrl().endsWith("/") ? provider.getBaseUrl() : provider.getBaseUrl() + "/";
        String url = base.endsWith("chat/completions/") || base.endsWith("chat/completions")
                ? base.replaceAll("/$", "") : base + "chat/completions";

        log.info("AI call: {} | {} | {} chars", provider.getProviderName(), url, systemPrompt.length());
        try {
            HttpHeaders h = new HttpHeaders(); h.setContentType(MediaType.APPLICATION_JSON);
            h.set("Authorization", "Bearer " + provider.getApiKey());
            ResponseEntity<Map> resp = restTemplate.postForEntity(url, new HttpEntity<>(body, h), Map.class);
            if (resp.getBody() != null) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) resp.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> msg = (Map<String, Object>) choices.get(0).get("message");
                    if (msg != null && msg.get("content") instanceof String)
                        return (String) msg.get("content");
                }
            }
            throw new RuntimeException("AI 返回格式异常: " + (resp.getBody() != null ? resp.getBody().toString() : "empty body"));
        } catch (RuntimeException e) { throw e; }
        catch (Exception e) {
            String detail = e.getMessage();
            if (e instanceof org.springframework.web.client.HttpClientErrorException) {
                org.springframework.web.client.HttpClientErrorException he =
                    (org.springframework.web.client.HttpClientErrorException) e;
                detail = "HTTP " + he.getRawStatusCode() + " " + he.getResponseBodyAsString();
            }
            log.error("AI fail: {} | {}", url, detail);
            throw new RuntimeException("AI 调用失败: " + detail);
        }
    }

    private static String nvl(String s) { return s != null ? s : ""; }
    private static boolean isEmpty(String s) { return s == null || s.trim().isEmpty(); }

    // ========== 流式调用（SSE） ==========
    public void streamCall(ModelProvider provider, String systemPrompt, String userPrompt,
                           Consumer<String> onToken, Consumer<String> onDone, Consumer<String> onError) {
        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                String base = provider.getBaseUrl().endsWith("/") ? provider.getBaseUrl() : provider.getBaseUrl() + "/";
                String url = base.endsWith("chat/completions/") || base.endsWith("chat/completions")
                        ? base.replaceAll("/$", "") : base + "chat/completions";

                String json = String.format(
                    "{\"model\":\"%s\",\"messages\":[{\"role\":\"system\",\"content\":\"%s\"},{\"role\":\"user\",\"content\":\"%s\"}],\"stream\":true,\"temperature\":0.8,\"max_tokens\":8192}",
                    provider.getModelName(),
                    escapeJson(systemPrompt),
                    escapeJson(userPrompt)
                );

                URL apiUrl = new URL(url);
                conn = (HttpURLConnection) apiUrl.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Authorization", "Bearer " + provider.getApiKey());
                conn.setDoOutput(true);
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(120000);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(json.getBytes(StandardCharsets.UTF_8));
                }

                int code = conn.getResponseCode();
                if (code != 200) {
                    String err = readAll(conn.getErrorStream());
                    onError.accept("HTTP " + code + " " + err);
                    return;
                }

                StringBuilder fullContent = new StringBuilder();
                try (BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        if (line.startsWith("data: ")) {
                            String data = line.substring(6).trim();
                            if ("[DONE]".equals(data)) break;
                            try {
                                int contentStart = data.indexOf("\"content\":\"");
                                if (contentStart > 0) {
                                    int valStart = contentStart + 11;
                                    int valEnd = data.indexOf("\"", valStart);
                                    if (valEnd > valStart) {
                                        String token = data.substring(valStart, valEnd);
                                        token = unescapeJson(token);
                                        fullContent.append(token);
                                        onToken.accept(token);
                                    }
                                }
                            } catch (Exception ignored) {}
                        }
                    }
                }
                onDone.accept(fullContent.toString());
            } catch (Exception e) {
                onError.accept(e.getMessage());
            } finally {
                if (conn != null) conn.disconnect();
            }
        }).start();
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "").replace("\t", "\\t");
    }

    private String unescapeJson(String s) {
        StringBuilder sb = new StringBuilder();
        int i = 0;
        while (i < s.length()) {
            char c = s.charAt(i);
            if (c == '\\' && i + 1 < s.length()) {
                char next = s.charAt(i + 1);
                if (next == 'n') { sb.append('\n'); i += 2; continue; }
                if (next == 't') { sb.append('\t'); i += 2; continue; }
                if (next == 'r') { sb.append('\r'); i += 2; continue; }
                if (next == '\\') { sb.append('\\'); i += 2; continue; }
                if (next == '"') { sb.append('"'); i += 2; continue; }
                if (next == 'u' && i + 5 < s.length()) {
                    try {
                        String hex = s.substring(i + 2, i + 6);
                        sb.append((char) Integer.parseInt(hex, 16));
                        i += 6; continue;
                    } catch (Exception e) {}
                }
            }
            sb.append(c);
            i++;
        }
        return sb.toString();
    }

    private String readAll(InputStream is) throws IOException {
        if (is == null) return "";
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        byte[] b = new byte[4096]; int n;
        while ((n = is.read(b)) != -1) buf.write(b, 0, n);
        return buf.toString("UTF-8");
    }
}
