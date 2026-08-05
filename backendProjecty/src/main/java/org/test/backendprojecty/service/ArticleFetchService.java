package org.test.backendprojecty.service;

import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;

import java.util.stream.Collectors;

/**
 * Best-effort readable-text extraction for a saved article link, so the note
 * has real content stored in our own database instead of just a bookmark —
 * fetched synchronously at note-creation time (no async/job infra in this
 * app), and never blocks note creation: any failure just leaves body empty.
 */
@Service
@Slf4j
public class ArticleFetchService {

    private static final int MAX_BODY_LENGTH = 20_000;
    private static final int TIMEOUT_MS = 8_000;

    public String fetchArticleText(String url) {
        try {
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (compatible; CollabBot/1.0)")
                    .timeout(TIMEOUT_MS)
                    .get();

            doc.select("script, style, nav, footer, header, aside").remove();

            Elements paragraphs = doc.select("article p, main p, p");
            String text = paragraphs.isEmpty()
                    ? doc.body().text()
                    : paragraphs.stream().map(Element::text).collect(Collectors.joining("\n\n"));

            if (text.length() > MAX_BODY_LENGTH) {
                text = text.substring(0, MAX_BODY_LENGTH) + "…";
            }
            return text.isBlank() ? null : text;
        } catch (Exception e) {
            log.warn("Failed to fetch article content from {}: {}", url, e.getMessage());
            return null;
        }
    }
}
